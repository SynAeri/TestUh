# Context API routes for saving and retrieving coding session summaries
# Connects to POST /api/context endpoint

from fastapi import APIRouter, HTTPException
from uuid import uuid4
from app.models.schemas import (
    CodingContextRequest,
    CodingContextResponse,
    CodingContextSummary
)
from app.shared.data.store import store
from app.shared.services.ai_service import ai_service

router = APIRouter(prefix="/api/context", tags=["context"])

@router.post("", response_model=CodingContextResponse)
async def save_coding_context(request: CodingContextRequest):
    """
    Save a coding session context summary.
    Accepts either a raw transcript (which will be processed by AI) or structured data.
    """
    try:
        context_id = f"context-{uuid4().hex[:8]}"

        if request.transcript:
            summary = ai_service.summarize_coding_transcript(request.transcript)
        elif request.structured:
            summary = request.structured
        else:
            raise HTTPException(status_code=400, detail="Must provide either transcript or structured data")

        store.save_context(context_id, summary)

        return CodingContextResponse(
            context_id=context_id,
            message="Coding context saved successfully",
            linked_artifacts={
                "pr_id": summary.linked_pr_id or "none",
                "ticket_id": summary.linked_ticket_id or "none",
                "deployment_id": summary.linked_deployment_id or "none"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save context: {str(e)}")


@router.get("/{context_id}", response_model=CodingContextSummary)
async def get_coding_context(context_id: str):
    """Retrieve a coding context summary by ID"""
    context = store.get_context(context_id)

    if not context:
        raise HTTPException(status_code=404, detail=f"Context {context_id} not found")

    return context
