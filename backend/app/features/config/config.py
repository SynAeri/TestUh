# Configuration API routes for MCP skill
# Provides allowed repos list and other runtime config
# Connects to GET /config/allowed-repos

from fastapi import APIRouter

router = APIRouter(prefix="/config", tags=["config"])

ALLOWED_REPOS = [
    "SynAeri/Playcrowd",
    "SynAeri/TestUh",
    "Testah",
    "Playcrowd",
    "TestUh"
]


@router.get("/allowed-repos")
async def get_allowed_repos():
    """
    Returns list of repositories that are allowed to log AI sessions.
    MCP skill checks this before sending session/decision data.
    """
    return {
        "allowed_repos": ALLOWED_REPOS,
        "match_mode": "contains"
    }


@router.get("/status")
async def get_config_status():
    """Returns current configuration status for MCP skill."""
    return {
        "logging_enabled": True,
        "allowed_repo_count": len(ALLOWED_REPOS),
        "allowed_repos": ALLOWED_REPOS
    }
