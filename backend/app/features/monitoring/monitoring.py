# Automatic incident monitoring and detection system
# Provides error tracking and deployment logging endpoints
# Auto-creates incidents when error thresholds are exceeded (3+ errors in 5 minutes)
# Tracks service health and links errors to latest deployments
# Deployment events can be linked to PRs and AI sessions for full context
# Endpoints: POST /api/monitoring/error, POST /api/monitoring/deploy, GET /api/monitoring/health/{service_name}

from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4
from app.models.schemas import IncidentDetail
from app.shared.data.supabase_store import supabase_store
from app.config.supabase import get_supabase_client
from pydantic import BaseModel

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])


class ErrorEvent(BaseModel):
    service_name: str
    error_message: str
    error_type: str
    stack_trace: Optional[str] = None
    user_id: Optional[str] = None
    request_path: Optional[str] = None
    environment: str = "production"
    timestamp: Optional[str] = None


class DeploymentEvent(BaseModel):
    service_name: str
    commit_sha: str
    environment: str = "production"
    deployed_by: str
    pr_number: Optional[int] = None
    branch: Optional[str] = None


@router.post("/deploy")
async def log_deployment(event: DeploymentEvent):
    """
    Automatically log deployments for incident linking.
    Call this from your CI/CD pipeline after successful deployment.

    Example:
    curl -X POST http://backend/api/monitoring/deploy \\
      -H "Content-Type: application/json" \\
      -d '{
        "service_name": "payment-service",
        "commit_sha": "abc123",
        "environment": "production",
        "deployed_by": "github-actions",
        "pr_number": 42
      }'
    """
    try:
        supabase = get_supabase_client()

        deployment_id = f"deploy-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid4().hex[:6]}"

        # Find PR by number if provided
        pr_id = None
        session_id = None
        if event.pr_number:
            pr_result = supabase.table("pull_requests").select("pr_id, session_id").eq("pr_id", f"PR-{event.pr_number}").execute()
            if pr_result.data:
                pr_id = pr_result.data[0]["pr_id"]
                session_id = pr_result.data[0].get("session_id")

        # Create deployment record
        deployment_data = {
            "deployment_id": deployment_id,
            "commit_sha": event.commit_sha,
            "environment": event.environment,
            "service_name": event.service_name,
            "deployed_by": event.deployed_by,
            "timestamp": datetime.utcnow().isoformat(),
            "status": "success",
            "pr_id": pr_id,
            "session_id": session_id
        }

        supabase.table("deployments").insert(deployment_data).execute()

        return {
            "status": "success",
            "deployment_id": deployment_id,
            "message": f"Deployment logged for {event.service_name}",
            "linked_pr": pr_id,
            "linked_session": session_id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log deployment: {str(e)}")


@router.post("/error")
async def receive_error(event: ErrorEvent):
    """
    Receive error events from application monitoring.
    Automatically creates incidents when error thresholds are exceeded.

    Integration examples:

    // JavaScript/Node.js
    fetch('http://backend/api/monitoring/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_name: 'payment-service',
        error_message: 'Payment timeout after 5s',
        error_type: 'TimeoutError',
        environment: 'production'
      })
    });

    // Python
    import requests
    requests.post('http://backend/api/monitoring/error', json={
        'service_name': 'payment-service',
        'error_message': 'Payment timeout after 5s',
        'error_type': 'TimeoutError',
        'environment': 'production'
    })
    """
    try:
        supabase = get_supabase_client()

        # Log error event
        error_id = f"err-{uuid4().hex[:8]}"
        error_data = {
            "error_id": error_id,
            "service_name": event.service_name,
            "error_message": event.error_message,
            "error_type": event.error_type,
            "stack_trace": event.stack_trace,
            "user_id": event.user_id,
            "request_path": event.request_path,
            "environment": event.environment,
            "timestamp": event.timestamp or datetime.utcnow().isoformat()
        }

        supabase.table("error_events").insert(error_data).execute()

        # Check if we should auto-create an incident
        # Count recent errors (last 5 minutes) for this service
        five_min_ago = (datetime.utcnow() - timedelta(minutes=5)).isoformat()
        recent_errors = supabase.table("error_events").select("error_id").eq(
            "service_name", event.service_name
        ).eq(
            "environment", event.environment
        ).gte("timestamp", five_min_ago).execute()

        error_count = len(recent_errors.data)

        # Threshold: Create incident if 3+ errors in 5 minutes
        should_create_incident = error_count >= 3

        if should_create_incident:
            # Check if incident already exists for this service
            existing_incident = supabase.table("incidents").select("incident_id").eq(
                "impacted_service", event.service_name
            ).eq("status", "open").execute()

            if not existing_incident.data:
                # Find latest deployment for this service
                latest_deployment = supabase.table("deployments").select("*").eq(
                    "service_name", event.service_name
                ).eq(
                    "environment", event.environment
                ).order("timestamp", desc=True).limit(1).execute()

                deployment = None
                pr = None
                context = None

                if latest_deployment.data:
                    deployment_data = latest_deployment.data[0]
                    from app.models.schemas import DeploymentRecord
                    deployment = DeploymentRecord(
                        deployment_id=deployment_data["deployment_id"],
                        commit_sha=deployment_data["commit_sha"],
                        environment=deployment_data["environment"],
                        service_name=deployment_data["service_name"],
                        deployed_by=deployment_data["deployed_by"],
                        timestamp=datetime.fromisoformat(deployment_data["timestamp"].replace('Z', '+00:00')),
                        status=deployment_data["status"]
                    )

                    # Get PR and context
                    if deployment_data.get("pr_id"):
                        pr = supabase_store.get_pr(deployment_data["pr_id"])

                    if deployment_data.get("session_id"):
                        context = supabase_store.get_session_context(deployment_data["session_id"])

                # Create incident
                incident_id = f"INC-{datetime.utcnow().strftime('%Y-%m-%d')}-{uuid4().hex[:6]}"

                # Build symptoms from recent errors
                error_messages = [e["error_message"] for e in recent_errors.data[:5]] if hasattr(recent_errors, 'data') else []
                symptoms = f"{error_count} errors in last 5 minutes. Recent errors: {', '.join(set(error_messages[:3]))}"

                incident = IncidentDetail(
                    incident_id=incident_id,
                    title=f"{event.error_type} in {event.service_name}",
                    symptoms=symptoms,
                    impacted_service=event.service_name,
                    severity="high" if error_count >= 10 else "medium",
                    status="open",
                    created_at=datetime.utcnow(),
                    deployment=deployment,
                    related_pr=pr,
                    coding_context=context
                )

                # Save incident
                supabase_store.save_incident(incident)

                return {
                    "status": "incident_created",
                    "error_id": error_id,
                    "incident_id": incident_id,
                    "error_count": error_count,
                    "message": f"Auto-created incident {incident_id} after {error_count} errors",
                    "incident_link": f"/incident/{incident_id}"
                }

        return {
            "status": "logged",
            "error_id": error_id,
            "error_count": error_count,
            "threshold_met": should_create_incident,
            "message": f"Error logged ({error_count}/3 errors in 5min)"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process error: {str(e)}")


@router.get("/health/{service_name}")
async def get_service_health(service_name: str, minutes: int = 60):
    """
    Get error rate and health status for a service.
    Returns error count, rate, and current incidents.
    """
    try:
        supabase = get_supabase_client()

        time_ago = (datetime.utcnow() - timedelta(minutes=minutes)).isoformat()

        # Get recent errors
        errors = supabase.table("error_events").select("*").eq(
            "service_name", service_name
        ).gte("timestamp", time_ago).execute()

        # Get open incidents
        incidents = supabase.table("incidents").select("incident_id, title, severity, created_at").eq(
            "impacted_service", service_name
        ).eq("status", "open").execute()

        error_count = len(errors.data) if errors.data else 0
        error_rate = error_count / minutes  # errors per minute

        health_status = "healthy"
        if error_count >= 10:
            health_status = "critical"
        elif error_count >= 5:
            health_status = "degraded"

        return {
            "service_name": service_name,
            "health_status": health_status,
            "error_count": error_count,
            "error_rate": round(error_rate, 2),
            "time_window_minutes": minutes,
            "open_incidents": incidents.data if incidents.data else [],
            "recent_errors": errors.data[:10] if errors.data else []
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get service health: {str(e)}")
