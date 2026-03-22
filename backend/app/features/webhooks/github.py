# GitHub webhook handler for pull request events
# Receives PR events from GitHub and automatically:
# - Links PRs to AI sessions based on repo/branch matching
# - Marks AI decisions as pre-PR or post-PR based on timestamps
# - Saves PR metadata to pull_requests table with session_id link
# - Auto-creates incidents when PRs are opened with Gemini severity analysis
# - Creates deployment records for tracking incident origins
# Endpoints: POST /webhooks/github, GET /webhooks/github/test

import hmac
import hashlib
import os
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Header
from app.config.supabase import get_supabase_client
from app.shared.services.ai_service import ai_service
from datetime import datetime
from uuid import uuid4

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "")


def verify_github_signature(payload: bytes, signature: str) -> bool:
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
    supabase = get_supabase_client()

    # Find sessions for this branch (both active and recently ended)
    all_sessions = supabase.table("ai_sessions").select("*").eq(
        "branch", branch
    ).execute()

    repo_short = repo_name.split("/")[-1].lower()
    matching_sessions = [
        s for s in all_sessions.data
        if s["repo"].lower() == repo_name.lower() or
           s["repo"].lower() == repo_short or
           s["repo"].lower().endswith("/" + repo_short) or
           repo_name.lower().endswith("/" + s["repo"].lower())
    ]

    result = type('obj', (object,), {'data': matching_sessions})()

    updated_sessions = []
    decisions_marked = 0
    pr_saved = False

    first_session_id = result.data[0]["id"] if result.data else None

    if first_session_id:
        try:
            supabase.table("pull_requests").upsert({
                "pr_id": f"PR-{pr_number}",
                "title": pr_data.get("title", ""),
                "description": pr_data.get("body", ""),
                "author": pr_data.get("user", {}).get("login", "unknown"),
                "commit_sha": pr_data.get("head", {}).get("sha", ""),
                "status": "open" if pr_data.get("state") == "open" else pr_data.get("state", "open"),
                "created_at": pr_created_at,
                "merged_at": pr_data.get("merged_at"),
                "files_changed": [f.get("filename") for f in pr_data.get("files", [])][:20],  # Limit to first 20 files
                "session_id": first_session_id,
                "metadata": {
                    "github_url": pr_data.get("html_url"),
                    "repo": repo_name,
                    "branch": branch
                }
            }).execute()
            pr_saved = True
        except Exception as e:
            print(f"Error saving PR to database: {e}")

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
        "total_sessions": len(updated_sessions),
        "pr_saved": pr_saved
    }


async def auto_create_incident_for_opened_pr(pr_number: int, pr_data: dict, session_ids: list) -> dict:
    """
    Auto-creates incident when PR is opened AND triggers automated analysis + fix PR.

    This connects the full automation chain:
    1. User codes with Claude → MCP logs session
    2. User creates PR → This function runs
    3. Creates deployment + incident
    4. Triggers automated analysis (background task)
    5. Automated fix PR created
    """
    from fastapi import BackgroundTasks

    supabase = get_supabase_client()

    if not session_ids:
        return None

    session_id = session_ids[0]

    session_result = supabase.table("ai_sessions").select("*").eq("id", session_id).execute()
    if not session_result.data:
        return None

    session = session_result.data[0]

    decisions_result = supabase.table("ai_decisions").select("*").eq("session_id", session_id).order("timestamp").execute()
    decisions = decisions_result.data

    if not decisions:
        return None

    chat_summary = "\n".join([f"- {d['summary']}: {d['reasoning']}" for d in decisions[:10]])
    pr_title = pr_data.get("title", "")
    pr_body = pr_data.get("body", "")
    files_changed = [f.get("filename") for f in pr_data.get("files", [])[:20]]

    severity_prompt = f"""Analyze this opened PR and AI coding session to determine incident severity.

PR: {pr_title}
Description: {pr_body}
Files changed: {', '.join(files_changed)}

AI Session Decisions:
{chat_summary}

Based on:
- Complexity of changes
- Number of files affected
- Risk level mentioned in decisions
- Production impact potential

Respond with ONLY one word: low, medium, or high"""

    try:
        if not ai_service.use_mock and not ai_service.use_anthropic:
            response = ai_service.model.generate_content(severity_prompt)
            severity_text = response.text.strip().lower()
            severity = severity_text if severity_text in ["low", "medium", "high"] else "medium"
        else:
            severity = "high" if len(decisions) >= 5 or len(files_changed) >= 10 else "medium"
    except:
        severity = "medium"

    incident_id = f"INC-{datetime.utcnow().strftime('%Y-%m-%d')}-{uuid4().hex[:6]}"

    deployment_id = f"deploy-pr{pr_number}-{datetime.utcnow().strftime('%Y%m%d%H%M')}"
    deployment_data = {
        "deployment_id": deployment_id,
        "commit_sha": pr_data.get("merge_commit_sha", pr_data.get("head", {}).get("sha", "unknown")),
        "environment": "production",
        "service_name": session.get("repo", "Unknown Service"),
        "timestamp": datetime.utcnow().isoformat(),
        "status": "success",
        "deployed_by": "auto-deploy",
        "pr_id": f"PR-{pr_number}",
        "session_id": session_id
    }
    supabase.table("deployments").insert(deployment_data).execute()

    incident_data = {
        "incident_id": incident_id,
        "title": f"Monitoring: {pr_title}",
        "symptoms": f"Auto-generated incident for opened PR #{pr_number}. Monitor for potential issues from proposed changes.",
        "impacted_service": session.get("repo", "Unknown Service"),
        "severity": severity,
        "status": "open",
        "created_at": datetime.utcnow().isoformat(),
        "deployment_id": deployment_id,
        "pr_id": f"PR-{pr_number}",
        "session_id": session_id
    }

    supabase.table("incidents").insert(incident_data).execute()

    # ✨ NEW: Trigger automated analysis + fix PR creation in background
    auto_analyze_enabled = os.getenv("AUTO_ANALYZE_INCIDENTS", "true").lower() == "true"

    if auto_analyze_enabled:
        print(f"[WEBHOOK] Incident {incident_id} created, triggering automated analysis...")
        # Import the auto_analyze_and_fix function from incidents module
        try:
            import asyncio
            from app.features.incidents.incidents import auto_analyze_and_fix

            # Schedule background task (fire and forget)
            asyncio.create_task(auto_analyze_and_fix(incident_id))
            print(f"[WEBHOOK] ✅ Automated workflow queued for {incident_id}")
        except Exception as e:
            print(f"[WEBHOOK] ⚠️ Failed to queue automated workflow: {e}")

    return {
        "incident_id": incident_id,
        "severity": severity,
        "deployment_id": deployment_id,
        "auto_analyze": auto_analyze_enabled,
        "message": f"Auto-created incident with {severity} severity based on AI session analysis"
    }


@router.post("/github")
async def github_webhook(
    request: Request,
    x_github_event: Optional[str] = Header(None),
    x_hub_signature_256: Optional[str] = Header(None)
):
    payload = await request.body()

    if not verify_github_signature(payload, x_hub_signature_256 or ""):
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = await request.json()

    if x_github_event != "pull_request":
        return {"status": "ignored", "reason": "not a pull_request event"}

    action = data.get("action")
    if action not in ["opened", "reopened", "synchronize", "closed"]:
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

    incident_info = None
    if action == "opened":
        incident_info = await auto_create_incident_for_opened_pr(pr_number, pr, result.get("updated_sessions", []))

    response = {
        "status": "success",
        "action": action,
        "pr_number": pr_number,
        "repo": repo_full_name,
        "branch": branch,
        "sessions_updated": result["updated_sessions"],
        "decisions_marked_pre_pr": result["decisions_marked"],
        "message": f"PR milestone added to {result['total_sessions']} session(s), marked {result['decisions_marked']} decision(s) as pre-PR"
    }

    if incident_info:
        response["incident_created"] = incident_info

    return response


@router.get("/github/test")
async def test_github_webhook():
    return {
        "status": "webhook endpoint active",
        "secret_configured": bool(GITHUB_WEBHOOK_SECRET)
    }
