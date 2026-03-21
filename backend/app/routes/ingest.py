# Ingest endpoint routes for triggering mock data ingestion
# POST /ingest/mock - Standardizes 15 curated files into Supabase

from fastapi import APIRouter, HTTPException
from app.models.schemas import IngestResponse
from app.services.ingest_service import ingest_mock_data

router = APIRouter(prefix="/ingest", tags=["ingestion"])

@router.post("/mock", response_model=IngestResponse)
async def trigger_mock_ingestion():
    try:
        result = await ingest_mock_data()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
