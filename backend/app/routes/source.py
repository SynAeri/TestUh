# Source endpoint routes for document lineage and trust views
# GET /source/{id} - Returns raw content and metadata for a specific source

from fastapi import APIRouter, HTTPException
from app.models.schemas import SourceDetailResponse
from app.services.source_service import get_source_by_id

router = APIRouter(tags=["source"])

@router.get("/source/{source_id}", response_model=SourceDetailResponse)
async def get_source_detail(source_id: str):
    result = await get_source_by_id(source_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Source not found")
    return result
