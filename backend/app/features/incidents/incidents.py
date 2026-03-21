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
                # Find PR by commit SHA
                pr_result = supabase_store.client.table("pull_requests").select("*").eq("commit_sha", deployment.commit_sha).execute()
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
                    # Get session context
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
