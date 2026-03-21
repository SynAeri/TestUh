# Insights endpoint routes for ROI dashboard data
# GET /insights - Returns optimization recommendations and tool overlap analysis

from fastapi import APIRouter
from app.models.schemas import InsightsResponse
from app.services.insights_service import get_insights

router = APIRouter(tags=["insights"])

@router.get("/insights", response_model=InsightsResponse)
async def fetch_insights():
    return get_insights()
