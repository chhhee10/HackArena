"""
Agent 2B — Regulation Loader
Loads local regulation corpus (DPDP, GDPR, RBI) and enriches it with
a live web search via the Groq compound model.
"""

import json
import logging
from pathlib import Path

from token_pool import pool
from config import MODELS

logger = logging.getLogger(__name__)

REGULATIONS_DIR = Path(__file__).parent.parent / "regulations"

REG_SEARCH_SYSTEM = """You are a legal research assistant specialised in Indian and international data protection law.
Search the web for the LATEST developments on the following regulation topics and return a JSON object:
{
  "DPDP_2023": {"latest_amendment": "...", "recent_enforcement": "...", "notes": "..."},
  "GDPR": {"latest_amendment": "...", "recent_enforcement": "...", "notes": "..."},
  "RBI": {"latest_amendment": "...", "recent_enforcement": "...", "notes": "..."}
}
Focus on: 2024-2025 enforcement actions, new guidelines, penalty amounts, interpretation changes.
If no updates found for a regulation, set the fields to null."""


def _load_local_corpus() -> dict:
    """Load all regulation JSON files from the regulations/ directory."""
    corpus: dict = {}
    for json_file in REGULATIONS_DIR.glob("*.json"):
        try:
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            short_name = data.get("short", json_file.stem.upper())
            corpus[short_name] = data
            logger.debug(f"Loaded regulation corpus: {short_name}")
        except Exception as e:
            logger.warning(f"Failed to load {json_file}: {e}")
    return corpus


async def agent_reg_loader(state: dict) -> dict:
    if state.get("error"):
        return state

    job_id = state["job_id"]
    logger.info(f"[Agent 2B — Reg Loader] job={job_id}")

    # 1. Load local corpus
    regulation_corpus = _load_local_corpus()
    logger.info(f"[Agent 2B] Loaded {len(regulation_corpus)} local regulation files")

    # 2. Attempt live web search enrichment (compound model)
    try:
        raw = await pool.call(
            model=MODELS["reg_loader"],
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Search for the latest 2024-2025 updates, enforcement actions, "
                        "and interpretation guidance for: DPDP Act 2023 (India), GDPR (EU), "
                        "RBI data localisation and payment system guidelines (India)."
                    ),
                }
            ],
            temperature=0.0,
            response_format={"type": "json_object"},
        )
        live_updates = json.loads(raw)
        # Merge live updates into corpus
        for reg_key, updates in live_updates.items():
            if reg_key in regulation_corpus and isinstance(updates, dict):
                regulation_corpus[reg_key]["live_updates"] = updates
                logger.info(f"[Agent 2B] Merged live updates for {reg_key}")
    except Exception as e:
        # Non-fatal — local corpus is sufficient
        logger.warning(f"[Agent 2B] Live regulation search failed (using local only): {e}")

    return {**state, "regulation_corpus": regulation_corpus}
