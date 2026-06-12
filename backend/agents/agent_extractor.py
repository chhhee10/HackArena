"""
Agent 2A — Extractor
Parses the contract file and uses an LLM to segment it into typed clauses.
"""

import io
import json
import logging
import uuid
from pathlib import Path

from token_pool import pool
from config import MODELS
from routers.sse import push_event

logger = logging.getLogger(__name__)

EXTRACTOR_SYSTEM = """You are a senior legal document analyst.
Your task is to parse the provided contract text and segment it into individual clauses.

For EVERY clause in the document return a JSON array (no wrapper, no markdown):
[
  {
    "clause_id": "c_001",
    "clause_type": "<one of: data_processing | liability | termination | payment | ip_ownership | dispute_resolution | confidentiality | other>",
    "text": "<exact clause text>",
    "page_hint": "<approximate location e.g. 'Section 3.2' or 'Page 4'>"
  }
]

Rules:
- Include EVERY clause, even boilerplate ones.
- Clause IDs must be unique strings in the format c_001, c_002, ...
- Do not summarise — use the exact original text for the 'text' field.
- If the document has no discernible clauses, return an empty array []."""


def _extract_text_from_file(file_path: str) -> str:
    """Extract raw text from PDF or DOCX."""
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext == ".pdf":
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages]
        return "\n\n".join(pages).strip()

    if ext == ".docx":
        import docx
        doc = docx.Document(file_path)
        return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())

    raise ValueError(f"Unsupported file extension: {ext}")


async def agent_extractor(state: dict) -> dict:
    if state.get("error"):
        return state

    job_id    = state["job_id"]
    file_path = state["file_path"]

    logger.info(f"[Agent 2A — Extractor] job={job_id}")

    try:
        # 1. Parse file to plain text
        raw_text = _extract_text_from_file(file_path)
        if not raw_text:
            raise ValueError("No text could be extracted from the document.")
        logger.info(f"[Agent 2A] Extracted {len(raw_text)} chars of text")

        # 2. LLM clause segmentation — cap at 40K chars to stay within context
        raw = await pool.call(
            model=MODELS["extractor"],
            messages=[
                {"role": "system", "content": EXTRACTOR_SYSTEM},
                {"role": "user", "content": raw_text[:40000]},
            ],
            temperature=0.0,
            response_format={"type": "json_object"},
        )

        # 3. Parse response — model may wrap in an object
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            clauses = parsed
        else:
            clauses = next(
                (v for v in parsed.values() if isinstance(v, list)), []
            )

        # 4. Ensure every clause has a unique clause_id
        seen_ids: set[str] = set()
        for i, clause in enumerate(clauses):
            cid = clause.get("clause_id")
            if not cid or cid in seen_ids:
                clause["clause_id"] = f"c_{i+1:03d}"
            seen_ids.add(clause["clause_id"])

        logger.info(f"[Agent 2A] {len(clauses)} clauses extracted")

        await push_event(job_id, {
            "event": "extraction_complete",
            "job_id": job_id,
            "clause_count": len(clauses),
        })

        return {**state, "raw_text": raw_text, "clause_manifest": clauses}

    except Exception as e:
        logger.error(f"[Agent 2A — Extractor] FATAL: {e}")
        await push_event(job_id, {"event": "pipeline_error", "job_id": job_id, "error": str(e)})
        return {**state, "error": str(e)}
