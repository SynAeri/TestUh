# Fix drafting and review API routes
# Connects to POST /api/fix/draft and POST /api/reviews/assign

from fastapi import APIRouter, HTTPException
from uuid import uuid4
from app.models.schemas import (
    FixDraftRequest,
    FixDraftResponse,
    ReviewAssignRequest,
    ReviewAssignResponse
)
from app.shared.data.supabase_store import supabase_store
from app.shared.services.ai_service import ai_service

router = APIRouter(prefix="/api", tags=["fix"])

@router.post("/fix/draft", response_model=FixDraftResponse)
async def draft_fix(request: FixDraftRequest):
    """
    Generate an AI-drafted fix for an incident using coding context.
    Uses Gemini AI for analysis.
    Returns probable cause, proposed fix, and patch notes for review.
    """
    try:
        incident = supabase_store.get_incident(request.incident_id)
        if not incident:
            raise HTTPException(status_code=404, detail=f"Incident {request.incident_id} not found")

        if not incident.coding_context:
            raise HTTPException(
                status_code=400,
                detail="No coding context linked to this incident. Cannot draft fix."
            )

        # Log what we're sending to AI
        print(f"[DRAFT FIX] Incident: {incident.title}")
        print(f"[DRAFT FIX] Coding context decisions: {len(incident.coding_context.decisions)}")
        print(f"[DRAFT FIX] Coding context assumptions: {len(incident.coding_context.assumptions)}")

        fix_data = ai_service.draft_fix_for_incident(incident, incident.coding_context)

        draft_id = f"draft-{uuid4().hex[:8]}"
        mock_pr_id = f"PR-{uuid4().hex[:4]}"

        fix_response = FixDraftResponse(
            incident_id=request.incident_id,
            analysis=fix_data["analysis"],
            probable_cause=fix_data["probable_cause"],
            proposed_fix=fix_data["proposed_fix"],
            patch_notes=fix_data["patch_notes"],
            reviewer="on-call-engineer@company.com",
            review_state="pending",
            draft_id=draft_id,
            mock_pr_id=mock_pr_id
        )

        supabase_store.save_fix(fix_response)

        return fix_response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to draft fix: {str(e)}")


@router.post("/reviews/assign", response_model=ReviewAssignResponse)
async def assign_review(request: ReviewAssignRequest):
    """
    Assign a drafted fix to an engineer for review.
    Updates the review state and assigns owner.
    """
    try:
        fix = supabase_store.get_fix(request.draft_id)
        if not fix:
            raise HTTPException(status_code=404, detail=f"Draft {request.draft_id} not found")

        fix.reviewer = request.reviewer
        fix.review_state = "in_review"

        supabase_store.update_fix_review_state(request.draft_id, request.reviewer, "in_review")

        return ReviewAssignResponse(
            draft_id=request.draft_id,
            reviewer=request.reviewer,
            review_state="in_review",
            message=f"Fix assigned to {request.reviewer} for review"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to assign review: {str(e)}")
