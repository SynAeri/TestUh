# FastAPI main application for AI-Powered Incident Response Platform
# Provides MVP endpoints for hackathon golden road demo

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.features.context import context
from app.features.demo import demo
from app.features.incidents import incidents
from app.features.fix import fix
from app.features.ai_sessions import ai_sessions
from app.features.config import config
from app.features.webhooks import github
from app.shared.data.seed import seed_golden_road_data

app = FastAPI(
    title="AI-Powered Incident Response Platform",
    description="Links AI coding context to production incidents for faster resolution",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(context.router)
app.include_router(demo.router)
app.include_router(incidents.router)
app.include_router(fix.router)
app.include_router(ai_sessions.router)
app.include_router(config.router)
app.include_router(github.router)

@app.on_event("startup")
async def startup_event():
    """Seed demo data on startup"""
    seed_golden_road_data()

@app.get("/")
async def root():
    return {
        "message": "AI-Powered Incident Response Platform",
        "version": "1.0.0",
        "endpoints": [
            "GET /api/demo/packet - Get complete seeded demo data",
            "POST /api/context - Save coding context summary",
            "GET /api/context/{id} - Get coding context",
            "POST /api/incidents/trigger - Trigger fake incident",
            "GET /api/incidents/{id} - Get incident with linked artifacts",
            "GET /api/incidents - List all incidents",
            "POST /api/fix/draft - Draft AI fix for incident",
            "POST /api/reviews/assign - Assign fix for review",
            "POST /api/demo/reset - Reset demo data",
            "POST /sessions - Create AI session (MCP skill)",
            "POST /decisions - Log AI decision (MCP skill)",
            "POST /sessions/{id}/end - End AI session (MCP skill)",
            "GET /sessions/{id} - Get session with decisions",
            "GET /sessions - List all AI sessions",
            "GET /sessions/{id}/pr-timeline - Get decisions grouped by PR milestones",
            "GET /decisions - List all AI decisions",
            "GET /config/allowed-repos - Get allowed repos for MCP skill",
            "GET /config/status - Get MCP configuration status",
            "POST /webhooks/github - GitHub webhook for PR events",
            "GET /webhooks/github/test - Test webhook endpoint"
        ]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
