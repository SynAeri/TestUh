# Query endpoint routes for RAG-based semantic search
# POST /query - Performs vector search and returns AI-generated answers with citations

from fastapi import APIRouter, HTTPException
from app.models.schemas import QueryRequest, QueryResponse
from app.services.query_service import query_rag

router = APIRouter(tags=["query"])

@router.post("/query", response_model=QueryResponse)
async def search_query(request: QueryRequest):
    try:
        result = await query_rag(request.query, request.limit)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
