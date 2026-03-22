# AI Session API routes for MCP skill integration
# Connects to POST /sessions, POST /decisions, POST /sessions/:id/end
# Logs Claude's coding sessions and decisions to Supabase
# Auto-creates incidents for sessions with high-impact decisions

from fastapi import APIRouter, HTTPException
from app.models.schemas import AISession, AIDecision, AISessionEndRequest
from app.config.supabase import get_supabase_client
from app.shared.services.ai_service import ai_service
from datetime import datetime
from uuid import uuid4
from typing import Optional

router = APIRouter(tags=["ai-sessions"])


async def _auto_create_incident_for_session(session_id: str) -> Optional[dict]:
    """
    Auto-create incident for a session if it has high-impact decisions.
    Used when session ends or for batch processing unprocessed sessions.
    """
    try:
        supabase = get_supabase_client()

        # Get session data
        session_result = supabase.table("ai_sessions").select("*").eq("id", session_id).execute()
        if not session_result.data:
            return None

        session = session_result.data[0]

        # Get decisions for this session
        decisions_result = supabase.table("ai_decisions").select("*").eq("session_id", session_id).order("timestamp").execute()
        decisions = decisions_result.data

        if not decisions:
            return None

        # Check if this session already has an incident
        existing_incident = supabase.table("incidents").select("incident_id").eq("session_id", session_id).execute()
        if existing_incident.data:
            return {"incident_id": existing_incident.data[0]["incident_id"], "status": "already_exists"}

        # Analyze decisions to determine if incident should be created
        high_impact_decisions = [d for d in decisions if d.get("impact") == "high"]
        medium_impact_decisions = [d for d in decisions if d.get("impact") == "medium"]
        low_impact_decisions = [d for d in decisions if d.get("impact") == "low"]
        total_files_changed = set()
        for d in decisions:
            total_files_changed.update(d.get("files_changed", []))

        # Create incident if ANY decisions exist (including low-impact)
        # This ensures all AI coding sessions with decisions get tracked
        should_create = len(decisions) >= 1

        if not should_create:
            return None

        # Build summary of session for AI severity analysis
        chat_summary = "\n".join([f"- {d['summary']}: {d['reasoning']}" for d in decisions[:10]])
        files_list = list(total_files_changed)[:20]

        severity_prompt = f"""Analyze this AI coding session to determine incident severity for monitoring.

Session: {session.get('repo')} ({session.get('branch')})
Engineer: {session.get('engineer', 'AI Agent')}
Ticket: {session.get('ticket_id', 'N/A')}

Decisions made:
{chat_summary}

Files changed: {', '.join(files_list)}
Total decisions: {len(decisions)}
High-impact decisions: {len(high_impact_decisions)}

Based on:
- Complexity of changes
- Number of files affected
- Risk level mentioned in decisions
- Production impact potential

Respond with ONLY one word: low, medium, high, or critical"""

        # Determine severity using AI or heuristics
        try:
            if not ai_service.use_mock and not ai_service.use_anthropic:
                response = ai_service.model.generate_content(severity_prompt)
                severity_text = response.text.strip().lower()
                severity = severity_text if severity_text in ["low", "medium", "high", "critical"] else "medium"
            else:
                # Heuristic-based severity
                if len(high_impact_decisions) >= 3 or len(total_files_changed) >= 15:
                    severity = "high"
                elif len(high_impact_decisions) >= 1 or len(medium_impact_decisions) >= 2 or len(total_files_changed) >= 5:
                    severity = "medium"
                else:
                    # Low-impact or minimal changes
                    severity = "low"
        except:
            severity = "low"  # Default to low for minimal sessions

        # Create deployment record for this session
        deployment_id = f"deploy-session-{session_id[:8]}-{datetime.utcnow().strftime('%Y%m%d%H%M')}"
        deployment_data = {
            "deployment_id": deployment_id,
            "commit_sha": f"session-{session_id[:12]}",  # Placeholder, will be updated when PR is created
            "environment": "production",
            "service_name": session.get("repo", "Unknown Service"),
            "timestamp": datetime.utcnow().isoformat(),
            "status": "success",
            "deployed_by": session.get("engineer") or "AI Agent",  # Ensure non-null value
            "pr_id": session.get("pr_id"),
            "session_id": session_id
        }
        supabase.table("deployments").insert(deployment_data).execute()

        # Create incident
        incident_id = f"INC-{datetime.utcnow().strftime('%Y-%m-%d')}-{uuid4().hex[:6]}"

        # Build symptoms from decisions (prioritize high-impact, then medium, then all)
        symptom_summaries = [d['summary'] for d in high_impact_decisions[:3]]
        if not symptom_summaries:
            symptom_summaries = [d['summary'] for d in medium_impact_decisions[:3]]
        if not symptom_summaries:
            symptom_summaries = [d['summary'] for d in decisions[:3]]

        symptoms = f"AI session completed with {len(decisions)} decisions ({len(high_impact_decisions)} high, {len(medium_impact_decisions)} medium, {len(low_impact_decisions)} low). Key changes: {', '.join(symptom_summaries)}"

        incident_data = {
            "incident_id": incident_id,
            "title": f"AI Session: {session.get('repo')} - {session.get('ticket_id', 'Feature Development')}",
            "symptoms": symptoms,
            "impacted_service": session.get("repo", "Unknown Service"),
            "severity": severity,
            "status": "open",
            "created_at": datetime.utcnow().isoformat(),
            "deployment_id": deployment_id,
            "pr_id": session.get("pr_id"),
            "session_id": session_id
        }

        supabase.table("incidents").insert(incident_data).execute()

        return {
            "incident_id": incident_id,
            "severity": severity,
            "deployment_id": deployment_id,
            "message": f"Auto-created incident with {severity} severity based on {len(decisions)} decisions ({len(high_impact_decisions)} high, {len(medium_impact_decisions)} medium, {len(low_impact_decisions)} low)",
            "decision_count": len(decisions),
            "high_impact_count": len(high_impact_decisions),
            "medium_impact_count": len(medium_impact_decisions),
            "low_impact_count": len(low_impact_decisions),
            "files_changed_count": len(total_files_changed)
        }

    except Exception as e:
        print(f"Error auto-creating incident for session {session_id}: {e}")
        return None


@router.post("/sessions", response_model=dict)
async def create_session(session: AISession):
    """
    Create a new AI coding session.
    Called by MCP skill when nexus_start_session is invoked.
    Endpoint: POST /sessions
    """
    try:
        supabase = get_supabase_client()

        # Insert session into Supabase
        result = supabase.table("ai_sessions").insert({
            "id": session.id,
            "repo": session.repo,
            "branch": session.branch,
            "agent": session.agent,
            "engineer": session.engineer,
            "ticket_id": session.ticket_id,
            "started_at": session.started_at,
            "ended_at": session.ended_at,
            "pr_id": session.pr_id,
            "decision_count": session.decision_count,
            "metadata": session.metadata or {}
        }).execute()

        return {
            "status": "success",
            "session_id": session.id,
            "message": f"Session {session.id} created successfully"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create session: {str(e)}"
        )


@router.post("/decisions", response_model=dict)
async def log_decision(decision: AIDecision):
    """
    Log an AI decision during a coding session.
    Called by MCP skill when nexus_log_decision is invoked.
    Endpoint: POST /decisions
    """
    try:
        supabase = get_supabase_client()

        # Insert decision into Supabase
        result = supabase.table("ai_decisions").insert({
            "id": decision.id,
            "session_id": decision.session_id,
            "summary": decision.summary,
            "reasoning": decision.reasoning,
            "impact": decision.impact,
            "files_changed": decision.files_changed,
            "ticket_id": decision.ticket_id,
            "timestamp": decision.timestamp,
            "pr_milestone": decision.pr_milestone,
            "metadata": decision.metadata or {}
        }).execute()

        # Update decision count in session (increment by 1)
        session_result = supabase.table("ai_sessions").select("decision_count").eq("id", decision.session_id).execute()
        if session_result.data:
            current_count = session_result.data[0].get("decision_count", 0)
            supabase.table("ai_sessions").update({
                "decision_count": current_count + 1
            }).eq("id", decision.session_id).execute()

        return {
            "status": "success",
            "decision_id": decision.id,
            "session_id": decision.session_id,
            "message": f"Decision {decision.id} logged successfully"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to log decision: {str(e)}"
        )


@router.post("/sessions/{session_id}/end", response_model=dict)
async def end_session(session_id: str, request: AISessionEndRequest):
    """
    End an AI coding session.
    Called by MCP skill when nexus_end_session is invoked.
    Endpoint: POST /sessions/:id/end

    Automatically creates an incident if the session has high-impact decisions.
    """
    try:
        supabase = get_supabase_client()

        # Update session with end time and PR ID
        result = supabase.table("ai_sessions").update({
            "ended_at": request.ended_at,
            "pr_id": request.pr_id
        }).eq("id", session_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found"
            )

        # Auto-create incident if session has high-impact decisions
        incident_info = await _auto_create_incident_for_session(session_id)

        response = {
            "status": "success",
            "session_id": session_id,
            "message": f"Session {session_id} ended successfully"
        }

        if incident_info:
            response["incident_created"] = incident_info

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to end session: {str(e)}"
        )


@router.get("/sessions/{session_id}", response_model=dict)
async def get_session(session_id: str):
    """
    Retrieve a session with all its decisions.
    Useful for linking sessions to incidents.
    """
    try:
        supabase = get_supabase_client()

        # Get session
        session_result = supabase.table("ai_sessions").select("*").eq("id", session_id).execute()

        if not session_result.data:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found"
            )

        # Get decisions for this session
        decisions_result = supabase.table("ai_decisions").select("*").eq("session_id", session_id).order("timestamp").execute()

        return {
            "session": session_result.data[0],
            "decisions": decisions_result.data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve session: {str(e)}"
        )


@router.get("/sessions", response_model=dict)
async def list_sessions(repo: str = None, branch: str = None, pr_id: str = None):
    """
    List all AI sessions with optional filtering.
    Query params: repo, branch, pr_id
    """
    try:
        supabase = get_supabase_client()

        query = supabase.table("ai_sessions").select("*")

        if repo:
            query = query.eq("repo", repo)
        if branch:
            query = query.eq("branch", branch)
        if pr_id:
            query = query.eq("pr_id", pr_id)

        result = query.order("started_at", desc=True).execute()

        return {
            "sessions": result.data,
            "count": len(result.data)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list sessions: {str(e)}"
        )


@router.get("/decisions", response_model=dict)
async def list_decisions(session_id: str = None, impact: str = None):
    """
    List all AI decisions with optional filtering.
    Query params: session_id, impact
    """
    try:
        supabase = get_supabase_client()

        query = supabase.table("ai_decisions").select("*")

        if session_id:
            query = query.eq("session_id", session_id)
        if impact:
            query = query.eq("impact", impact)

        result = query.order("timestamp", desc=True).execute()

        return {
            "decisions": result.data,
            "count": len(result.data)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list decisions: {str(e)}"
        )


@router.get("/sessions/{session_id}/pr-timeline", response_model=dict)
async def get_session_pr_timeline(session_id: str):
    """
    Get session decisions grouped by PR milestones.
    Shows which decisions were made before/after each PR.
    """
    try:
        supabase = get_supabase_client()

        session_result = supabase.table("ai_sessions").select("*").eq("id", session_id).execute()

        if not session_result.data:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

        session = session_result.data[0]
        pr_milestones = session.get("pr_milestones", [])

        decisions_result = supabase.table("ai_decisions").select("*").eq("session_id", session_id).order("timestamp").execute()

        timeline = {
            "session_id": session_id,
            "repo": session.get("repo"),
            "branch": session.get("branch"),
            "pr_milestones": pr_milestones,
            "decisions_by_phase": {}
        }

        decisions_before_any_pr = []
        decisions_by_pr = {}

        for decision in decisions_result.data:
            pr_milestone = decision.get("pr_milestone")

            if not pr_milestone:
                decisions_before_any_pr.append(decision)
            else:
                pr_id = pr_milestone.get("pr_id")
                created_before = pr_milestone.get("created_before_pr", False)

                phase_key = f"pr_{pr_id}_{'before' if created_before else 'after'}"

                if phase_key not in decisions_by_pr:
                    decisions_by_pr[phase_key] = []

                decisions_by_pr[phase_key].append(decision)

        if decisions_before_any_pr:
            timeline["decisions_by_phase"]["before_any_pr"] = decisions_before_any_pr

        timeline["decisions_by_phase"].update(decisions_by_pr)

        return timeline

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get PR timeline: {str(e)}"
        )


@router.post("/sessions/process-unprocessed", response_model=dict)
async def process_unprocessed_sessions():
    """
    Batch process all AI sessions that have decisions but no incidents.
    Creates incidents for qualifying sessions (high-impact decisions, many files changed, etc.)

    Run this endpoint to catch up on sessions created before auto-incident was implemented.
    """
    try:
        supabase = get_supabase_client()

        # Get all sessions
        all_sessions = supabase.table("ai_sessions").select("id").execute()

        processed_sessions = []
        incidents_created = []
        skipped_sessions = []

        for session_data in all_sessions.data:
            session_id = session_data["id"]

            # Check if session has any decisions
            decisions_result = supabase.table("ai_decisions").select("id", count="exact").eq("session_id", session_id).execute()
            decision_count = decisions_result.count or 0

            if decision_count == 0:
                skipped_sessions.append({"session_id": session_id, "reason": "no_decisions"})
                continue

            # Try to create incident
            incident_info = await _auto_create_incident_for_session(session_id)

            if incident_info:
                if incident_info.get("status") == "already_exists":
                    skipped_sessions.append({"session_id": session_id, "reason": "incident_exists", "incident_id": incident_info["incident_id"]})
                else:
                    incidents_created.append({
                        "session_id": session_id,
                        "incident_id": incident_info["incident_id"],
                        "severity": incident_info["severity"],
                        "decision_count": incident_info.get("decision_count")
                    })
                    processed_sessions.append(session_id)
            else:
                skipped_sessions.append({"session_id": session_id, "reason": "did_not_qualify"})

        return {
            "status": "success",
            "total_sessions_checked": len(all_sessions.data),
            "incidents_created": len(incidents_created),
            "sessions_skipped": len(skipped_sessions),
            "details": {
                "created": incidents_created,
                "skipped": skipped_sessions[:10]  # Return first 10 skipped for brevity
            },
            "message": f"Processed {len(all_sessions.data)} sessions, created {len(incidents_created)} incidents"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process sessions: {str(e)}"
        )


@router.post("/sessions/{session_id}/create-incident", response_model=dict)
async def manually_create_incident_for_session(session_id: str):
    """
    Manually trigger incident creation for a specific session.
    Useful for testing or creating incidents for specific sessions on-demand.
    """
    try:
        incident_info = await _auto_create_incident_for_session(session_id)

        if not incident_info:
            return {
                "status": "not_created",
                "session_id": session_id,
                "message": "Session does not qualify for incident creation (no decisions or already has incident)"
            }

        if incident_info.get("status") == "already_exists":
            return {
                "status": "already_exists",
                "session_id": session_id,
                "incident_id": incident_info["incident_id"],
                "message": "Incident already exists for this session"
            }

        return {
            "status": "created",
            "session_id": session_id,
            "incident": incident_info,
            "message": f"Successfully created incident {incident_info['incident_id']}"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create incident: {str(e)}"
        )
