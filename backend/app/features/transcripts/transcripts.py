# Transcript logging endpoints for MCP skill
# Receives and stores full conversation transcripts from Claude coding sessions
# Stores in both Supabase (persistent) and in-memory (fallback)

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.shared.data.store import store as STORE
from app.config.supabase import get_supabase_client

router = APIRouter(prefix="/transcripts", tags=["transcripts"])

def _get_supabase():
    """Get Supabase client with error handling"""
    try:
        return get_supabase_client()
    except Exception as e:
        print(f"Supabase unavailable: {e}")
        return None

class TranscriptMessage(BaseModel):
    id: str
    session_id: str
    role: str  # "user" or "assistant"
    content: str
    message_type: str = "chat"  # "chat", "tool", "system"
    timestamp: str

class SessionTranscriptResponse(BaseModel):
    session_id: str
    messages: List[TranscriptMessage]
    total_messages: int

@router.post("")
async def log_transcript_message(message: TranscriptMessage):
    """
    Log a single message from a conversation transcript.
    Called by MCP skill for every user/assistant message.
    Stores in Supabase if available, falls back to in-memory.
    """
    transcript_entry = {
        "id": message.id,
        "session_id": message.session_id,
        "role": message.role,
        "content": message.content,
        "message_type": message.message_type,
        "timestamp": message.timestamp,
    }

    # Store in Supabase
    supabase = _get_supabase()
    if supabase:
        try:
            supabase.table("transcripts").insert(transcript_entry).execute()
        except Exception as e:
            print(f"Failed to store in Supabase: {e}, falling back to in-memory")
            STORE.transcripts.append(transcript_entry)
    else:
        # Fallback to in-memory
        STORE.transcripts.append(transcript_entry)

    return {
        "status": "logged",
        "transcript_id": message.id,
        "session_id": message.session_id,
        "storage": "supabase" if supabase else "in-memory"
    }

@router.get("/{session_id}")
async def get_session_transcript(session_id: str):
    """
    Retrieve the full conversation transcript for a session.
    Returns all messages in chronological order.
    """
    supabase = _get_supabase()

    if supabase:
        try:
            result = supabase.table("transcripts")\
                .select("*")\
                .eq("session_id", session_id)\
                .order("timestamp")\
                .execute()
            messages = result.data or []
        except Exception as e:
            print(f"Supabase query failed: {e}, using in-memory")
            messages = [
                t for t in STORE.transcripts
                if t["session_id"] == session_id
            ]
            messages.sort(key=lambda m: m["timestamp"])
    else:
        messages = [
            t for t in STORE.transcripts
            if t["session_id"] == session_id
        ]
        messages.sort(key=lambda m: m["timestamp"])

    if not messages:
        raise HTTPException(status_code=404, detail="No transcript found for this session")

    return {
        "session_id": session_id,
        "messages": messages,
        "total_messages": len(messages)
    }

@router.get("")
async def list_all_transcripts():
    """
    List all available transcripts grouped by session.
    """
    supabase = _get_supabase()

    if supabase:
        try:
            result = supabase.table("transcripts").select("session_id, timestamp").execute()
            all_transcripts = result.data or []
        except Exception as e:
            print(f"Supabase query failed: {e}")
            all_transcripts = STORE.transcripts
    else:
        all_transcripts = STORE.transcripts

    sessions = {}
    for t in all_transcripts:
        sid = t["session_id"]
        if sid not in sessions:
            sessions[sid] = []
        sessions[sid].append(t)

    summary = [
        {
            "session_id": sid,
            "message_count": len(messages),
            "first_message_at": min(m["timestamp"] for m in messages),
            "last_message_at": max(m["timestamp"] for m in messages),
        }
        for sid, messages in sessions.items()
    ]

    return {
        "total_sessions": len(summary),
        "sessions": summary
    }


@router.get("/{session_id}/refined")
async def get_refined_transcript(session_id: str, force_regenerate: bool = False):
    """
    Get AI-refined/summarized version of the transcript.
    Focuses on major changes, decisions, and key discussions.
    Uses Gemini to generate summary, caches result in Supabase.
    """
    import os
    import requests

    supabase = _get_supabase()

    # Check cache first (unless force regenerate)
    if supabase and not force_regenerate:
        try:
            cached = supabase.table("transcript_refinements")\
                .select("*")\
                .eq("session_id", session_id)\
                .eq("refinement_type", "major_changes")\
                .execute()

            if cached.data:
                return {
                    "session_id": session_id,
                    "refined_content": cached.data[0]["refined_content"],
                    "generated_at": cached.data[0]["generated_at"],
                    "cached": True
                }
        except Exception as e:
            print(f"Cache lookup failed: {e}")

    # Get raw transcript
    if supabase:
        try:
            result = supabase.table("transcripts")\
                .select("*")\
                .eq("session_id", session_id)\
                .order("timestamp")\
                .execute()
            messages = result.data or []
        except:
            messages = [t for t in STORE.transcripts if t["session_id"] == session_id]
    else:
        messages = [t for t in STORE.transcripts if t["session_id"] == session_id]

    if not messages:
        raise HTTPException(status_code=404, detail="No transcript found")

    # Build conversation for Gemini
    conversation_text = "\n\n".join([
        f"[{m['role'].upper()}]: {m['content']}"
        for m in messages
    ])

    # Call Gemini to refine
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    prompt = f"""Analyze this coding session transcript and create a refined summary focusing on:
1. Major decisions made and their reasoning
2. Key changes implemented
3. Important discussions about architecture/approach
4. Problems encountered and how they were resolved

Ignore small talk, repetitive confirmations, and minor details.
Format as a clear, structured summary with bullet points.

TRANSCRIPT:
{conversation_text}

REFINED SUMMARY:"""

    try:
        response = requests.post(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
            headers={"Content-Type": "application/json"},
            params={"key": gemini_key},
            json={
                "contents": [{"parts": [{"text": prompt}]}]
            }
        )
        response.raise_for_status()
        result = response.json()
        refined_content = result["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API failed: {str(e)}")

    # Cache result
    if supabase:
        try:
            supabase.table("transcript_refinements").upsert({
                "session_id": session_id,
                "refinement_type": "major_changes",
                "refined_content": refined_content,
                "metadata": {"message_count": len(messages), "model": "gemini-pro"}
            }, on_conflict="session_id,refinement_type").execute()
        except Exception as e:
            print(f"Failed to cache refinement: {e}")

    return {
        "session_id": session_id,
        "refined_content": refined_content,
        "generated_at": datetime.utcnow().isoformat(),
        "cached": False
    }
