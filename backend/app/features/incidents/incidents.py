# Incident API routes for triggering and retrieving incidents
# Connects to POST /api/incidents/trigger and GET /api/incidents/{id}

from fastapi import APIRouter, HTTPException
from uuid import uuid4
from datetime import datetime
from app.models.schemas import (
    IncidentTriggerRequest,
    IncidentResponse,
    IncidentDetail
)
from app.shared.data.supabase_store import supabase_store

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

@router.post("/trigger", response_model=IncidentResponse)
async def trigger_incident(request: IncidentTriggerRequest):
    """
    Create a fake incident tied to a deployment.
    Optionally generates a mock Slack notification link.
    """
    try:
        incident_id = f"INC-{datetime.utcnow().strftime('%Y-%m-%d')}-{uuid4().hex[:6]}"

        deployment = supabase_store.get_deployment(request.linked_deployment_id)
        if not deployment:
            raise HTTPException(
                status_code=404,
                detail=f"Deployment {request.linked_deployment_id} not found"
            )

        pr_id = None
        ticket_id = None
        context_id = None

        # Get PR and context from deployment via Supabase
        pr = None
        context = None
        if deployment:
            try:
                # Find PR by commit SHA (or by deployment metadata)
                pr_result = supabase_store.client.table("pull_requests").select("*").eq("commit_sha", deployment.commit_sha).execute()

                # If not found by exact commit match, try finding by deployment's linked PR
                if not pr_result.data:
                    deployment_result = supabase_store.client.table("deployments").select("pr_id").eq("deployment_id", deployment.deployment_id).execute()
                    if deployment_result.data and deployment_result.data[0].get('pr_id'):
                        pr_id = deployment_result.data[0]['pr_id']
                        pr_result = supabase_store.client.table("pull_requests").select("*").eq("pr_id", f"PR-{pr_id}").execute()

                # Last fallback: parse PR number from deployment ID (e.g., "deploy-pr10-...")
                if not pr_result.data and "pr" in deployment.deployment_id.lower():
                    import re
                    match = re.search(r'pr(\d+)', deployment.deployment_id, re.IGNORECASE)
                    if match:
                        pr_number = match.group(1)
                        pr_result = supabase_store.client.table("pull_requests").select("*").eq("pr_id", f"PR-{pr_number}").execute()

                if pr_result.data:
                    pr_data = pr_result.data[0]
                    from app.models.schemas import PRMock
                    pr = PRMock(
                        pr_id=pr_data['pr_id'],
                        title=pr_data['title'],
                        description=pr_data.get('description', ''),
                        author=pr_data['author'],
                        commit_sha=pr_data['commit_sha'],
                        status=pr_data['status'],
                        created_at=datetime.fromisoformat(pr_data['created_at'].replace('Z', '+00:00')),
                        merged_at=datetime.fromisoformat(pr_data['merged_at'].replace('Z', '+00:00')) if pr_data.get('merged_at') else None,
                        files_changed=pr_data.get('files_changed', [])
                    )
                    # Find the best session for this PR (prefer one with transcripts)
                    try:
                        sessions_result = supabase_store.client.table("ai_sessions").select("id").eq("pr_id", pr_data['pr_id'].replace('PR-', '')).execute()
                        if sessions_result.data:
                            # Check each session for transcript count
                            best_session_id = None
                            max_transcripts = 0
                            for session_data in sessions_result.data:
                                sid = session_data['id']
                                transcript_result = supabase_store.client.table("transcripts").select("id", count="exact").eq("session_id", sid).execute()
                                count = transcript_result.count or 0
                                if count > max_transcripts:
                                    max_transcripts = count
                                    best_session_id = sid

                            # Use session with most transcripts, or fall back to pr_data session_id
                            session_to_use = best_session_id if best_session_id else pr_data.get('session_id')
                            if session_to_use:
                                context = supabase_store.get_session_context(session_to_use)
                    except Exception as e:
                        print(f"Error finding best session: {e}")
                        # Fallback to PR's session_id
                        if pr_data.get('session_id'):
                            context = supabase_store.get_session_context(pr_data['session_id'])
            except Exception as e:
                print(f"Error linking PR/session: {e}")

        incident = IncidentDetail(
            incident_id=incident_id,
            title=request.title,
            symptoms=request.symptoms,
            impacted_service=request.impacted_service,
            severity=request.severity,
            status="open",
            created_at=datetime.utcnow(),
            deployment=deployment,
            related_pr=pr,
            coding_context=context
        )

        supabase_store.save_incident(incident)

        app_link = f"/incident/{incident_id}"
        slack_link = f"slack://channel?id=C123&message=Incident+{incident_id}+triggered"

        return IncidentResponse(
            incident_id=incident_id,
            slack_link=slack_link,
            app_link=app_link,
            message=f"Incident {incident_id} triggered successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger incident: {str(e)}")


@router.get("/{incident_id}", response_model=IncidentDetail)
async def get_incident(incident_id: str):
    """
    Retrieve full incident details with all linked artifacts:
    deployment, PR, ticket, and coding context.
    """
    incident = supabase_store.get_incident(incident_id)

    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

    return incident


@router.get("", response_model=list[IncidentDetail])
async def list_incidents():
    """List all incidents in the system"""
    return supabase_store.list_incidents()
