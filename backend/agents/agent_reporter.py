"""
Agent 6 — Reporter
Fires three concurrent outputs: GitHub PR, Slack alert, SSE completion event.
Writes the final audit trail record to SQLite.
"""

import asyncio
import datetime
import logging

from config import settings
from db.crud import AsyncSessionLocal, write_audit_trail, update_document_status
from outputs.github_pr import create_github_pr
from outputs.slack_webhook import send_slack_alert
from routers.sse import push_event

logger = logging.getLogger(__name__)


async def agent_reporter(state: dict) -> dict:
    if state.get("error"):
        return state

    job_id     = state["job_id"]
    org_id     = state["org_id"]
    project_id = state["project_id"]
    file_path  = state.get("file_path", "")
    risk_report = state.get("risk_report", [])
    redlines    = state.get("redlines", [])
    contradictions = state.get("contradiction_hits", [])
    historical_flags = state.get("historical_flags", [])

    filename = file_path.split("/")[-1] if file_path else "unknown"

    violation_count = sum(1 for c in risk_report if c.get("risk_level") == "violation")
    high_count      = sum(1 for c in risk_report if c.get("risk_level") == "high")
    medium_count    = sum(1 for c in risk_report if c.get("risk_level") == "medium")

    # Compute elapsed duration (best effort)
    duration_seconds = 0.0
    try:
        async with AsyncSessionLocal() as session:
            from db.crud import get_document
            doc = await get_document(session, job_id)
            if doc and doc.created_at:
                duration_seconds = (
                    datetime.datetime.utcnow() - doc.created_at
                ).total_seconds()
    except Exception:
        pass

    logger.info(
        f"[Agent 6 — Reporter] job={job_id} | "
        f"violations={violation_count} | duration={duration_seconds:.1f}s"
    )

    # ------------------------------------------------------------------
    # Three concurrent outputs
    # ------------------------------------------------------------------
    github_pr_url, slack_sent = None, False
    try:
        github_pr_url, slack_sent = await asyncio.gather(
            create_github_pr(
                job_id=job_id,
                filename=filename,
                risk_report=risk_report,
                redlines=redlines,
                contradictions=contradictions,
                historical_flags=historical_flags,
                duration_seconds=duration_seconds,
                github_token=settings.GITHUB_TOKEN,
                github_repo=settings.GITHUB_REPO,
            ),
            send_slack_alert(
                filename=filename,
                job_id=job_id,
                violation_count=violation_count,
                high_count=high_count,
                medium_count=medium_count,
                github_pr_url=None,  # will be updated below
                slack_webhook_url=settings.SLACK_WEBHOOK_URL,
            ),
        )
    except Exception as e:
        logger.error(f"[Agent 6] Output delivery error: {e}")

    # If PR was created, re-send Slack with the PR URL (non-blocking)
    if github_pr_url:
        asyncio.create_task(
            send_slack_alert(
                filename=filename,
                job_id=job_id,
                violation_count=violation_count,
                high_count=high_count,
                medium_count=medium_count,
                github_pr_url=github_pr_url,
                slack_webhook_url=settings.SLACK_WEBHOOK_URL,
            )
        )

    # ------------------------------------------------------------------
    # Write audit trail to DB
    # ------------------------------------------------------------------
    try:
        risk_scores = {r["clause_id"]: r["risk_level"] for r in risk_report}
        agent_outputs = {
            "clause_count":     len(risk_report),
            "redline_count":    len(redlines),
            "contradiction_count": len(contradictions),
            "historical_flag_count": len(historical_flags),
        }
        async with AsyncSessionLocal() as session:
            await write_audit_trail(
                session=session,
                job_id=job_id,
                file_hash="",  # already written by ingestor
                agent_outputs=agent_outputs,
                risk_scores=risk_scores,
                github_pr_url=github_pr_url,
                violation_count=violation_count,
                duration_seconds=duration_seconds,
            )
            await update_document_status(session, job_id, "complete")
    except Exception as e:
        logger.error(f"[Agent 6] DB write failed: {e}")

    # ------------------------------------------------------------------
    # SSE completion event
    # ------------------------------------------------------------------
    await push_event(job_id, {
        "event":            "pipeline_complete",
        "job_id":           job_id,
        "pr_url":           github_pr_url,
        "slack_sent":       slack_sent,
        "violation_count":  violation_count,
        "high_count":       high_count,
        "medium_count":     medium_count,
        "total_clauses":    len(risk_report),
        "duration_seconds": round(duration_seconds, 1),
    })

    logger.info(f"[Agent 6] Pipeline complete | job={job_id}")

    return {
        **state,
        "github_pr_url":    github_pr_url,
        "slack_sent":       slack_sent,
        "duration_seconds": duration_seconds,
    }
