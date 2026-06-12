"""
Agent 2C — Memory Scanner
Embeds each clause, upserts to ChromaDB, detects intra-project contradictions,
and surfaces historically flagged patterns from the org-wide collection.
"""

import json
import logging
import datetime

from token_pool import pool
from config import MODELS
from memory.chroma_client import (
    get_project_collection,
    get_org_collection,
    upsert_clauses,
    query_similar,
)
from memory.embedder import embed_batch
from routers.sse import push_event

logger = logging.getLogger(__name__)

CONTRADICTION_SYSTEM = """You are a contract consistency analyst.
You will receive two clauses from the same document that cover a similar topic.
Determine whether they directly contradict each other.
A contradiction means the clauses make incompatible statements (e.g., one says data is deleted in 30 days,
the other says data is retained for 90 days).
Being about the same topic but not contradicting is NOT a contradiction.

Return ONLY valid JSON:
{
  "is_contradiction": true | false,
  "explanation": "clear explanation of the conflict or why there is none",
  "severity": "low | medium | high"
}"""


async def agent_memory(state: dict) -> dict:
    if state.get("error"):
        return state

    job_id     = state["job_id"]
    org_id     = state["org_id"]
    project_id = state["project_id"]
    clauses    = state.get("clause_manifest", [])

    logger.info(f"[Agent 2C — Memory] job={job_id} | {len(clauses)} clauses to embed")

    if not clauses:
        logger.warning("[Agent 2C] No clauses to embed — skipping memory layer")
        return {**state, "contradiction_hits": [], "historical_flags": []}

    try:
        proj_collection = get_project_collection(org_id, project_id)
        org_collection  = get_org_collection(org_id)
    except Exception as e:
        logger.error(f"[Agent 2C] ChromaDB init failed: {e}")
        # Non-fatal — continue without memory layer
        return {**state, "contradiction_hits": [], "historical_flags": []}

    # ------------------------------------------------------------------
    # 1. Generate embeddings for all clauses
    # ------------------------------------------------------------------
    texts = [c.get("text", "") for c in clauses]
    try:
        embeddings = await embed_batch(texts)
    except RuntimeError as e:
        logger.error(f"[Agent 2C] Ollama not available: {e} — skipping memory layer")
        await push_event(job_id, {
            "event": "memory_scan_complete",
            "job_id": job_id,
            "contradictions": 0,
            "historical_flags": 0,
            "warning": "Ollama not running — memory layer skipped",
        })
        return {**state, "contradiction_hits": [], "historical_flags": []}

    # ------------------------------------------------------------------
    # 2. Upsert to ChromaDB (project + org collections)
    # ------------------------------------------------------------------
    now_iso = datetime.datetime.utcnow().isoformat()
    clause_ids = [c["clause_id"] for c in clauses]
    metadatas  = [
        {
            "clause_id":   c["clause_id"],
            "clause_type": c.get("clause_type", "other"),
            "org_id":      org_id,
            "project_id":  project_id,
            "job_id":      job_id,
            "timestamp":   now_iso,
        }
        for c in clauses
    ]

    upsert_clauses(proj_collection, clause_ids, embeddings, texts, metadatas)
    upsert_clauses(org_collection,  clause_ids, embeddings, texts, metadatas)
    logger.info(f"[Agent 2C] Upserted {len(clauses)} clauses to ChromaDB")

    # ------------------------------------------------------------------
    # 3. Contradiction detection (project-level)
    # ------------------------------------------------------------------
    contradiction_hits: list[dict] = []

    for clause, embedding in zip(clauses, embeddings):
        cid = clause["clause_id"]
        # Query project collection excluding the current job
        results = query_similar(
            proj_collection,
            embedding,
            n_results=3,
            where={"job_id": {"$ne": job_id}},  # exclude current job's own clauses
        )
        similar_docs  = results.get("documents", [[]])[0]
        similar_metas = results.get("metadatas", [[]])[0]

        for sim_doc, sim_meta in zip(similar_docs, similar_metas):
            if not sim_doc:
                continue
            pair_text = f"Clause A:\n{clause['text']}\n\nClause B:\n{sim_doc}"
            try:
                raw = await pool.call(
                    model=MODELS["memory"],
                    messages=[
                        {"role": "system", "content": CONTRADICTION_SYSTEM},
                        {"role": "user", "content": pair_text},
                    ],
                    temperature=0.0,
                    response_format={"type": "json_object"},
                    max_tokens=300,
                )
                result = json.loads(raw)
                if result.get("is_contradiction") and result.get("severity") in ("medium", "high"):
                    contradiction_hits.append({
                        "clause_a_id":   cid,
                        "clause_b_id":   sim_meta.get("clause_id", "unknown"),
                        "clause_a_text": clause["text"][:400],
                        "clause_b_text": sim_doc[:400],
                        "explanation":   result.get("explanation", ""),
                        "severity":      result.get("severity", "medium"),
                    })
            except Exception as e:
                logger.debug(f"[Agent 2C] Contradiction check failed for {cid}: {e}")

    # ------------------------------------------------------------------
    # 4. Historical flagging (org-level)
    # ------------------------------------------------------------------
    historical_flags: list[dict] = []

    for clause, embedding in zip(clauses, embeddings):
        cid = clause["clause_id"]
        # Query org collection excluding current job
        results = query_similar(
            org_collection,
            embedding,
            n_results=2,
            where={"job_id": {"$ne": job_id}},
        )
        similar_docs  = results.get("documents", [[]])[0]
        similar_metas = results.get("metadatas", [[]])[0]
        similar_dists = results.get("distances", [[]])[0]

        for sim_doc, sim_meta, dist in zip(similar_docs, similar_metas, similar_dists):
            if not sim_doc:
                continue
            similarity = 1 - dist
            if similarity > 0.85:  # high semantic similarity threshold
                historical_flags.append({
                    "clause_id":         cid,
                    "text":              clause["text"][:300],
                    "flagged_in_job":    sim_meta.get("job_id", "unknown"),
                    "flagged_in_project": sim_meta.get("project_id", "unknown"),
                    "flagged_date":      sim_meta.get("timestamp", "unknown"),
                    "original_risk_level": "unknown",  # enriched by classifier later
                    "similarity_score":  round(similarity, 3),
                })

    logger.info(
        f"[Agent 2C] Memory scan complete | "
        f"contradictions={len(contradiction_hits)} | "
        f"historical_flags={len(historical_flags)}"
    )

    await push_event(job_id, {
        "event": "memory_scan_complete",
        "job_id": job_id,
        "contradictions": len(contradiction_hits),
        "historical_flags": len(historical_flags),
    })

    return {
        **state,
        "contradiction_hits": contradiction_hits,
        "historical_flags":   historical_flags,
    }
