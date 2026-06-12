"""
Slack webhook output — sends a 3-line contract review alert to a Slack channel.
"""

import logging
import httpx

logger = logging.getLogger(__name__)

SLACK_TIMEOUT = 10  # seconds


async def send_slack_alert(
    filename: str,
    job_id: str,
    violation_count: int,
    high_count: int,
    medium_count: int,
    github_pr_url: str | None,
    slack_webhook_url: str,
) -> bool:
    """
    POST a 3-line summary to the configured Slack webhook.

    Returns:
        True on success, False on failure (non-fatal — pipeline continues).
    """
    if not slack_webhook_url or "xxx" in slack_webhook_url:
        logger.info("Slack webhook not configured — skipping alert")
        return False

    risk_emoji = "🔴" if violation_count > 0 else ("🟠" if high_count > 0 else "🟡")
    pr_line = f"<{github_pr_url}|View full report on GitHub>" if github_pr_url else "GitHub PR not configured"

    payload = {
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{risk_emoji} Contract Review Complete",
                },
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*File:*\n{filename}"},
                    {"type": "mrkdwn", "text": f"*Job ID:*\n`{job_id}`"},
                    {
                        "type": "mrkdwn",
                        "text": (
                            f"*Risk Breakdown:*\n"
                            f"🔴 Violations: *{violation_count}* | "
                            f"🟠 High: *{high_count}* | "
                            f"🟡 Medium: *{medium_count}*"
                        ),
                    },
                    {"type": "mrkdwn", "text": f"*Report:*\n{pr_line}"},
                ],
            },
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=SLACK_TIMEOUT) as client:
            response = await client.post(slack_webhook_url, json=payload)
            response.raise_for_status()
            logger.info(f"Slack alert sent for job {job_id}")
            return True
    except Exception as e:
        logger.error(f"Slack alert failed for job {job_id}: {e}")
        return False
