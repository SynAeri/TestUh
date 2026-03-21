# GitHub webhook handler for pull request events
# Automatically links AI sessions to PRs when they're created
# Connects to POST /webhooks/github

import hmac
import hashlib
import os
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Header
from app.config.supabase import get_supabase_client

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "")


def verify_github_signature(payload: bytes, signature: str) -> bool:
    """Verify GitHub webhook signature."""
    if not GITHUB_WEBHOOK_SECRET:
        return True

    if not signature:
        return False

    hash_object = hmac.new(
        GITHUB_WEBHOOK_SECRET.encode('utf-8'),
        msg=payload,
        digestmod=hashlib.sha256
    )
    expected_signature = "sha256=" + hash_object.hexdigest()
    return hmac.compare_digest(expected_signature, signature)


async def link_pr_to_sessions(
    repo_name: str,
    branch: str,
    pr_number: int,
    pr_data: dict,
    pr_created_at: str
) -> dict:
    """
    Add PR milestone to sessions on this repo/branch.
    Marks all existing decisions as pre-PR, future decisions will be post-PR.
    Does NOT close sessions - allows continuous logging.
    """
    supabase = get_supabase_client()

    result = supabase.table("ai_sessions").select("*").eq(
        "repo", repo_name
    ).eq(
        "branch", branch
    ).is_("ended_at", "null").execute()

    updated_sessions = []
    decisions_marked = 0

    for session in result.data:
        session_id = session["id"]

        decisions_result = supabase.table("ai_decisions").select("id").eq(
            "session_id", session_id
        ).is_("pr_milestone", "null").execute()

        decision_count = len(decisions_result.data)

        for decision in decisions_result.data:
            supabase.table("ai_decisions").update({
                "pr_milestone": {
                    "pr_id": str(pr_number),
                    "created_before_pr": True,
                    "pr_created_at": pr_created_at
                }
            }).eq("id", decision["id"]).execute()
            decisions_marked += 1

        existing_milestones = session.get("pr_milestones") or []
        new_milestones = existing_milestones + [{
            "pr_id": str(pr_number),
            "pr_title": pr_data.get("title"),
            "pr_url": pr_data.get("html_url"),
            "pr_author": pr_data.get("user", {}).get("login"),
            "created_at": pr_created_at,
            "decision_count_at_pr": decision_count
        }]

        supabase.table("ai_sessions").update({
            "pr_id": str(pr_number) if not session.get("pr_id") else session.get("pr_id"),
            "pr_milestones": new_milestones,
            "metadata": {
                **(session.get("metadata") or {}),
                "latest_pr": str(pr_number)
            }
        }).eq("id", session_id).execute()

        updated_sessions.append(session_id)

    return {
        "updated_sessions": updated_sessions,
        "decisions_marked": decisions_marked,
        "total_sessions": len(updated_sessions)
    }


@router.post("/github")
async def github_webhook(
    request: Request,
    x_github_event: Optional[str] = Header(None),
    x_hub_signature_256: Optional[str] = Header(None)
):
    """
    GitHub webhook endpoint for pull request events.

    Setup in GitHub:
    1. Go to repo Settings > Webhooks > Add webhook
    2. Payload URL: https://your-backend.com/webhooks/github
    3. Content type: application/json
    4. Secret: Set GITHUB_WEBHOOK_SECRET in .env
    5. Events: Pull requests
    """

    payload = await request.body()

    if not verify_github_signature(payload, x_hub_signature_256 or ""):
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = await request.json()

    if x_github_event != "pull_request":
        return {"status": "ignored", "reason": "not a pull_request event"}

    action = data.get("action")
    if action not in ["opened", "reopened", "synchronize"]:
        return {"status": "ignored", "reason": f"action '{action}' not tracked"}

    pr = data.get("pull_request", {})
    repo = data.get("repository", {})

    repo_full_name = repo.get("full_name")
    branch = pr.get("head", {}).get("ref")
    pr_number = pr.get("number")

    if not all([repo_full_name, branch, pr_number]):
        raise HTTPException(status_code=400, detail="Missing required PR data")

    pr_created_at = pr.get("created_at")

    result = await link_pr_to_sessions(
        repo_name=repo_full_name,
        branch=branch,
        pr_number=pr_number,
        pr_data=pr,
        pr_created_at=pr_created_at
    )

    return {
        "status": "success",
        "action": action,
        "pr_number": pr_number,
        "repo": repo_full_name,
        "branch": branch,
        "sessions_updated": result["updated_sessions"],
        "decisions_marked_pre_pr": result["decisions_marked"],
        "message": f"PR milestone added to {result['total_sessions']} session(s), marked {result['decisions_marked']} decision(s) as pre-PR"
    }


@router.get("/github/test")
async def test_github_webhook():
    """Test endpoint to verify webhook is accessible."""
    return {
        "status": "webhook endpoint active",
        "secret_configured": bool(GITHUB_WEBHOOK_SECRET)
    }
