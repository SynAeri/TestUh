# AI Session API routes for MCP skill integration
# Connects to POST /sessions, POST /decisions, POST /sessions/:id/end
# Logs Claude's coding sessions and decisions to Supabase

from fastapi import APIRouter, HTTPException
from app.models.schemas import AISession, AIDecision, AISessionEndRequest
from app.config.supabase import get_supabase_client

router = APIRouter(tags=["ai-sessions"])


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
            "metadata": decision.metadata or {}
        }).execute()

        # Update decision count in session
        supabase.table("ai_sessions").update({
            "decision_count": supabase.rpc(
                "increment_decision_count",
                {"session_id": decision.session_id}
            )
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

        return {
            "status": "success",
            "session_id": session_id,
            "message": f"Session {session_id} ended successfully"
        }

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
