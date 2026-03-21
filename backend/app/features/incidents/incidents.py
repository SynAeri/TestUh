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
from app.shared.data.store import store

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

@router.post("/trigger", response_model=IncidentResponse)
async def trigger_incident(request: IncidentTriggerRequest):
    """
    Create a fake incident tied to a deployment.
    Optionally generates a mock Slack notification link.
    """
    try:
        incident_id = f"INC-{datetime.utcnow().strftime('%Y-%m-%d')}-{uuid4().hex[:6]}"

        deployment = store.get_deployment(request.linked_deployment_id)
        if not deployment:
            raise HTTPException(
                status_code=404,
                detail=f"Deployment {request.linked_deployment_id} not found"
            )

        pr_id = None
        ticket_id = None
        context_id = None

        for ctx_id, ctx in store.contexts.items():
            if ctx.linked_deployment_id == request.linked_deployment_id:
                context_id = ctx_id
                pr_id = ctx.linked_pr_id
                ticket_id = ctx.linked_ticket_id
                break

        pr = store.get_pr(pr_id) if pr_id else None
        ticket = store.get_ticket(ticket_id) if ticket_id else None
        context = store.get_context(context_id) if context_id else None

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
            related_ticket=ticket,
            coding_context=context
        )

        store.save_incident(incident)

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
    incident = store.get_incident(incident_id)

    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

    return incident


@router.get("", response_model=list[IncidentDetail])
async def list_incidents():
    """List all incidents in the system"""
    return list(store.incidents.values())
