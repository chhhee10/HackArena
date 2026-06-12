"""
Agent 5 — Redliner
Generates compliant replacement clauses for medium/high/violation risk clauses.
"""

import json
import logging
from token_pool import pool
from config import MODELS
from routers.sse import push_event

logger = logging.getLogger(__name__)

REDLINER_SYSTEM = """You are a senior legal drafter specialised in compliance with DPDP Act 2023, GDPR, and RBI Guidelines.

You will receive a legal clause that has been flagged as non-compliant.
Draft a REPLACEMENT clause that:
1. Satisfies the cited regulation's requirements exactly
2. Preserves the original commercial intent of the clause as much as possible
3. Uses clear, professional legal language appropriate for the document type
4. Is concise — do not pad with unnecessary legalese

Return ONLY valid JSON (no markdown):
{
  "redlined_text": "The full replacement clause text",
  "explanation": "1-2 sentences explaining what was changed and which regulation requirement it satisfies"
}"""

REDLINE_TARGET_LEVELS = {"medium", "high", "violation"}


async def agent_redliner(state: dict) -> dict:
    if state.get("error"):
        return state

    job_id            = state["job_id"]
    risk_report       = state.get("risk_report", [])
    regulation_corpus = state.get("regulation_corpus", {})

    flagged = [
        c for c in risk_report
        if c.get("risk_level") in REDLINE_TARGET_LEVELS
    ]

    logger.info(
        f"[Agent 5 — Redliner] job={job_id} | "
        f"{len(flagged)} of {len(risk_report)} clauses to redline"
    )

    redlines: list[dict] = []

    for clause in flagged:
        cid       = clause["clause_id"]
        reg_key   = clause.get("regulation", "NONE")
        risk_lvl  = clause["risk_level"]
        expl      = clause.get("explanation", "")

        # Build regulation context for this clause
        reg_context = ""
        if reg_key != "NONE" and reg_key in regulation_corpus:
            reg = regulation_corpus[reg_key]
            provisions = reg.get("key_provisions", [])[:2]
            reg_context = "\n".join(
                f"[{reg_key}] {p.get('requirement', '')[:300]}"
                for p in provisions
            )

        user_message = (
            f"RISK LEVEL: {risk_lvl.upper()}\n"
            f"REGULATION VIOLATED: {reg_key}\n"
            f"REASON FOR FLAG: {expl}\n\n"
            f"ORIGINAL CLAUSE:\n{clause.get('text', '')[:2000]}\n\n"
            f"RELEVANT REGULATION REQUIREMENTS:\n{reg_context}"
        )

        try:
            raw = await pool.call(
                model=MODELS["redliner"],
                messages=[
                    {"role": "system", "content": REDLINER_SYSTEM},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.0,
                response_format={"type": "json_object"},
                max_tokens=800,
            )
            result = json.loads(raw)
            redlines.append({
                "clause_id":     cid,
                "original_text": clause.get("text", ""),
                "redlined_text": result.get("redlined_text", ""),
                "explanation":   result.get("explanation", ""),
            })
        except Exception as e:
            logger.warning(f"[Agent 5] Redline failed for {cid}: {e}")
            # Append a placeholder so the clause still appears in output
            redlines.append({
                "clause_id":     cid,
                "original_text": clause.get("text", ""),
                "redlined_text": "",
                "explanation":   f"Redline generation failed: {e}",
            })

    logger.info(f"[Agent 5] Redlined {len(redlines)} clauses")

    await push_event(job_id, {
        "event": "redline_complete",
        "job_id": job_id,
        "redlined_count": len(redlines),
    })

    return {**state, "redlines": redlines}
