"""
Agent 3 — Classifier
Classifies each clause by risk level against the regulation corpus.
Implements a reflection loop for low-confidence results.
"""

import json
import logging
import xml.etree.ElementTree as ET
from token_pool import pool
from config import MODELS
from routers.sse import push_event

logger = logging.getLogger(__name__)

CONFIDENCE_THRESHOLD = 0.72
MAX_REFLECTIONS = 2
SSE_BATCH_SIZE = 5  # emit SSE every N clauses

CLASSIFIER_SYSTEM = """You are a senior legal compliance analyst specialised in DPDP Act 2023 (India), GDPR (EU), and RBI Guidelines (India).

You will receive:
1. A legal contract clause
2. Relevant regulation provisions
3. Any detected contradictions with other clauses
4. Any historical risk flags from the organisation

Classify the clause and return ONLY valid XML (no markdown, no explanation outside the tags):

<classification>
  <risk_level>compliant|low|medium|high|violation</risk_level>
  <regulation>DPDP_2023|GDPR|RBI|NONE</regulation>
  <explanation>Clear explanation of the risk or why it is compliant (2-3 sentences)</explanation>
  <confidence>0.00-1.00</confidence>
</classification>

Risk level definitions:
- compliant: clause meets all applicable regulatory requirements
- low: minor concern, no direct regulatory breach
- medium: potential regulatory issue, requires attention
- high: significant regulatory risk, likely breach
- violation: direct violation of cited regulation"""

REFLECTION_SYSTEM = """You are a senior legal compliance analyst.
Your previous classification had low confidence. Review the clause again more carefully.
Consider the regulation provisions, any contradictions, and historical patterns.
Return the same XML format as before but with higher confidence after deeper analysis."""


def _parse_xml_classification(xml_text: str) -> dict | None:
    """Parse the XML classification response. Returns None on parse failure."""
    try:
        # Strip any surrounding text before/after XML tags
        start = xml_text.find("<classification>")
        end   = xml_text.find("</classification>") + len("</classification>")
        if start == -1 or end < len("</classification>"):
            return None
        root = ET.fromstring(xml_text[start:end])
        return {
            "risk_level":  (root.findtext("risk_level") or "low").strip(),
            "regulation":  (root.findtext("regulation") or "NONE").strip(),
            "explanation": (root.findtext("explanation") or "").strip(),
            "confidence":  float(root.findtext("confidence") or 0.5),
        }
    except Exception:
        return None


def _build_clause_context(
    clause: dict,
    regulation_corpus: dict,
    contradiction_hits: list[dict],
    historical_flags: list[dict],
) -> str:
    """Build the user message for the classifier."""
    cid  = clause["clause_id"]
    ctype = clause.get("clause_type", "other")
    text  = clause.get("text", "")

    # Select the most relevant regulation snippets based on clause type
    reg_sections: list[str] = []
    type_to_reg = {
        "data_processing": ["DPDP_2023", "GDPR"],
        "payment":         ["RBI"],
        "liability":       ["GDPR", "DPDP_2023"],
        "ip_ownership":    ["GDPR"],
        "confidentiality": ["GDPR", "DPDP_2023"],
        "termination":     ["DPDP_2023"],
        "dispute_resolution": ["RBI"],
    }
    relevant_regs = type_to_reg.get(ctype, ["DPDP_2023", "GDPR", "RBI"])

    for reg_key in relevant_regs:
        reg = regulation_corpus.get(reg_key)
        if not reg:
            continue
        provisions = reg.get("key_provisions", [])[:3]  # top 3 provisions
        for p in provisions:
            section = p.get("section") or p.get("article") or p.get("circular", "")
            req = p.get("requirement", "")
            reg_sections.append(f"[{reg_key} §{section}] {req[:300]}")

    # Clause contradictions involving this clause
    clause_contradictions = [
        c for c in contradiction_hits
        if c.get("clause_a_id") == cid or c.get("clause_b_id") == cid
    ]

    # Historical flags for this clause
    clause_flags = [f for f in historical_flags if f.get("clause_id") == cid]

    lines = [
        f"CLAUSE ID: {cid}",
        f"CLAUSE TYPE: {ctype}",
        f"",
        f"CLAUSE TEXT:",
        text[:2000],
        "",
        "APPLICABLE REGULATION PROVISIONS:",
        *reg_sections,
    ]

    if clause_contradictions:
        lines += [
            "",
            "CONTRADICTIONS WITH OTHER CLAUSES:",
            *[f"- {c['explanation']}" for c in clause_contradictions],
        ]

    if clause_flags:
        lines += [
            "",
            "HISTORICAL FLAGS (from org's previous contracts):",
            *[
                f"- Previously flagged as '{f.get('original_risk_level')}' "
                f"in project '{f.get('flagged_in_project')}' on {f.get('flagged_date')}"
                for f in clause_flags
            ],
        ]

    return "\n".join(lines)


async def agent_classifier(state: dict) -> dict:
    if state.get("error"):
        return state

    job_id             = state["job_id"]
    clauses            = state.get("clause_manifest", [])
    regulation_corpus  = state.get("regulation_corpus", {})
    contradiction_hits = state.get("contradiction_hits", [])
    historical_flags   = state.get("historical_flags", [])

    logger.info(f"[Agent 3 — Classifier] job={job_id} | {len(clauses)} clauses")
    risk_report: list[dict] = []

    for i, clause in enumerate(clauses):
        cid = clause["clause_id"]
        context = _build_clause_context(
            clause, regulation_corpus, contradiction_hits, historical_flags
        )

        # Primary classification attempt
        classification: dict | None = None
        for reflection_round in range(MAX_REFLECTIONS + 1):
            system = CLASSIFIER_SYSTEM if reflection_round == 0 else REFLECTION_SYSTEM
            try:
                raw = await pool.call(
                    model=MODELS["classifier"],
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": context},
                    ],
                    temperature=0.0,
                    max_tokens=400,
                )
                classification = _parse_xml_classification(raw)
            except Exception as e:
                logger.warning(f"[Agent 3] Classification failed for {cid}: {e}")
                classification = None

            if classification and classification["confidence"] >= CONFIDENCE_THRESHOLD:
                if reflection_round > 0:
                    logger.debug(f"[Agent 3] {cid} confidence improved after reflection {reflection_round}")
                break

            if classification is None:
                # Parse failure — use safe default
                classification = {
                    "risk_level": "low",
                    "regulation": "NONE",
                    "explanation": "Classification could not be parsed — defaulted to low risk.",
                    "confidence": 0.5,
                }
                break

        risk_report.append({
            "clause_id":            cid,
            "clause_type":          clause.get("clause_type", "other"),
            "text":                 clause.get("text", ""),
            "risk_level":           classification["risk_level"],
            "regulation":           classification["regulation"],
            "explanation":          classification["explanation"],
            "confidence":           classification["confidence"],
            "contradiction_hits":   [
                c for c in contradiction_hits
                if c.get("clause_a_id") == cid or c.get("clause_b_id") == cid
            ],
            "historical_flags":     [
                f for f in historical_flags if f.get("clause_id") == cid
            ],
        })

        # SSE progress event every N clauses
        if (i + 1) % SSE_BATCH_SIZE == 0 or (i + 1) == len(clauses):
            await push_event(job_id, {
                "event": "classification_progress",
                "job_id": job_id,
                "done":  i + 1,
                "total": len(clauses),
            })

    violation_count = sum(1 for r in risk_report if r["risk_level"] == "violation")
    logger.info(
        f"[Agent 3] Classification complete | "
        f"violations={violation_count} | total={len(risk_report)}"
    )

    await push_event(job_id, {
        "event": "classification_complete",
        "job_id": job_id,
        "violation_count": violation_count,
    })

    return {**state, "risk_report": risk_report}
