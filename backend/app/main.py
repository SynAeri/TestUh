# FastAPI main application for Nexus OS backend
# Provides all MVP endpoints: /ingest/mock, /query, /insights, /source/{id}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import ingest, query, insights, source

app = FastAPI(
    title="Nexus OS API",
    description="Universal Data Layer API - Standardizing enterprise unstructured data",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(query.router)
app.include_router(insights.router)
app.include_router(source.router)

@app.get("/")
async def root():
    return {
        "message": "Nexus OS API",
        "version": "1.0.0",
        "endpoints": [
            "POST /ingest/mock - Trigger mock data ingestion",
            "POST /query - Semantic search with RAG",
            "GET /insights - ROI and optimization insights",
            "GET /source/{id} - Source lineage details"
        ]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/config-check")
async def config_check():
    import os
    return {
        "supabase_url_set": bool(os.getenv("SUPABASE_URL")),
        "supabase_key_set": bool(os.getenv("SUPABASE_KEY")),
        "gemini_key_set": bool(os.getenv("GEMINI_API_KEY")),
        "supabase_url_format": os.getenv("SUPABASE_URL", "")[:20] + "..." if os.getenv("SUPABASE_URL") else "not set"
    }
