"""
Nexus MCP Skill - Claude Code decision capture server

WHAT IT DOES:
Runs alongside Claude Code to automatically track coding sessions, architectural
decisions, and implementation choices. Logs are sent to backend for incident
analysis and PR tracing.

COMPONENTS:
- Session tracking: Records start/end of coding work with repo/branch context
- Decision logging: Captures technical choices with reasoning and impact level
- PR milestone tracking: Links decisions to pull requests (before/after PR creation)
- Allowed repos filtering: Only logs sessions for authorized repositories
- Local + remote storage: Saves to local sessions.json AND backend database

WORKFLOW:
1. Claude auto-starts session when beginning code work (reads git context)
2. Claude auto-logs decisions when making technical choices
3. User creates PR on GitHub -> webhook marks existing decisions as "before PR"
4. Claude continues logging -> new decisions marked as "after PR"
5. Session ends manually or continues across multiple PRs

BACKEND INTEGRATION:
- POST /sessions - Create new session
- POST /decisions - Log decision
- POST /sessions/:id/end - Close session
- GET /config/allowed-repos - Check if repo is authorized (cached 5min)
- GET /sessions/:id - Fetch session data for PR milestone context (cached 1min)

ENVIRONMENT VARIABLES:
- NEXUS_API_URL: Backend URL (if not set, logs locally only)

SETUP:
Add to Claude Code MCP config:
  {
    "mcpServers": {
      "nexus": {
        "command": "python",
        "args": ["/absolute/path/to/mcp-skill/server.py"],
        "env": {
          "NEXUS_API_URL": "https://your-backend.com"
        }
      }
    }
  }

ACKNOWLEDGMENT RESPONSES:
All tool calls return detailed status messages so Claude communicates tracking
to the user for transparency and audit awareness.
"""

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import subprocess

import httpx
from mcp.server.fastmcp import FastMCP

# ── Config ────────────────────────────────────────────────────────────────────

NEXUS_API_URL = os.getenv("NEXUS_API_URL", "").rstrip("/")
ALLOWED_REPOS = os.getenv("NEXUS_ALLOWED_REPOS", "").split(",") if os.getenv("NEXUS_ALLOWED_REPOS") else []
DATA_FILE = Path(__file__).parent / "sessions.json"

mcp = FastMCP("nexus-skill")

# ── In-memory state ───────────────────────────────────────────────────────────

_current_session: dict | None = None
_allowed_repos_cache: list[str] | None = None
_cache_timestamp: datetime | None = None
_session_pr_milestones: list[dict] = []
_pr_milestones_cache_time: datetime | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load_data() -> dict:
    if DATA_FILE.exists():
        return json.loads(DATA_FILE.read_text())
    return {"sessions": [], "decisions": []}


def _save_data(data: dict) -> None:
    DATA_FILE.write_text(json.dumps(data, indent=2, default=str))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _fetch_allowed_repos() -> list[str]:
    """Fetch allowed repos from backend with 5-minute cache."""
    global _allowed_repos_cache, _cache_timestamp

    if not NEXUS_API_URL:
        return []

    now = datetime.now(timezone.utc)
    if _allowed_repos_cache and _cache_timestamp:
        cache_age = (now - _cache_timestamp).total_seconds()
        if cache_age < 300:
            return _allowed_repos_cache

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{NEXUS_API_URL}/config/allowed-repos")
            if r.status_code == 200:
                data = r.json()
                _allowed_repos_cache = data.get("allowed_repos", [])
                _cache_timestamp = now
                return _allowed_repos_cache
    except Exception:
        pass

    return _allowed_repos_cache or []


def _is_repo_allowed(repo: str) -> bool:
    """Check if repo matches allowed list (synchronous wrapper)."""
    if not _allowed_repos_cache:
        return True

    for allowed in _allowed_repos_cache:
        if allowed.lower() in repo.lower():
            return True
    return False


async def _fetch_session_pr_milestones() -> list[dict]:
    """Fetch PR milestones for current session to tag new decisions."""
    global _session_pr_milestones, _pr_milestones_cache_time

    if not NEXUS_API_URL or not _current_session:
        return []

    now = datetime.now(timezone.utc)
    if _pr_milestones_cache_time:
        cache_age = (now - _pr_milestones_cache_time).total_seconds()
        if cache_age < 60:
            return _session_pr_milestones

    try:
        session_id = _current_session["id"]
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{NEXUS_API_URL}/sessions/{session_id}")
            if r.status_code == 200:
                data = r.json()
                session_data = data.get("session", {})
                _session_pr_milestones = session_data.get("pr_milestones", [])
                _pr_milestones_cache_time = now
                return _session_pr_milestones
    except Exception:
        pass

    return _session_pr_milestones


def _get_pr_milestone_context() -> dict | None:
    """Get PR milestone context for new decisions based on latest PR."""
    if not _session_pr_milestones:
        return None

    latest_pr = _session_pr_milestones[-1]
    return {
        "pr_id": latest_pr["pr_id"],
        "created_before_pr": False,
        "pr_created_at": latest_pr["created_at"]
    }


async def _post_to_backend(path: str, payload: dict) -> bool:
    """Fire-and-forget POST to backend. Returns True if successful."""
    if not NEXUS_API_URL:
        return False
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.post(f"{NEXUS_API_URL}{path}", json=payload)
            return r.status_code < 300
    except Exception:
        return False


# ── MCP Tools ─────────────────────────────────────────────────────────────────

@mcp.tool()
async def nexus_start_session(
    repo: str,
    branch: str,
    agent: str = "claude",
    engineer: Optional[str] = None,
    ticket_id: Optional[str] = None,
) -> str:
    """
    IMPORTANT: Call this automatically at the start of any coding session.

    You should proactively call this function when:
    - User asks you to build a feature, fix a bug, or write code
    - You're about to make significant code changes
    - Starting work on a new ticket/issue
    - Beginning any technical implementation work

    Extract repo/branch info from git context automatically.
    Do NOT ask the user - just call this function proactively.

    Args:
        repo: Repository name from git remote (e.g. "SynAeri/Playcrowd")
        branch: Current git branch from git status (e.g. "feat/auth")
        agent: AI agent being used (default: "claude")
        engineer: Engineer username if known (optional)
        ticket_id: Linked ticket/issue ID if mentioned (optional)
    """
    global _current_session

    await _fetch_allowed_repos()

    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    _current_session = {
        "id": session_id,
        "repo": repo,
        "branch": branch,
        "agent": agent,
        "engineer": engineer,
        "ticket_id": ticket_id,
        "started_at": _now(),
        "ended_at": None,
        "decision_ids": [],
    }

    data = _load_data()
    data["sessions"].append(_current_session)
    _save_data(data)

    if _is_repo_allowed(repo):
        await _post_to_backend("/sessions", _current_session)
        return (
            f"Session tracking started: {session_id}\n"
            f"Repository: {repo}@{branch}\n"
            f"Status: LOGGING ENABLED - All decisions will be audited for incident analysis\n"
            f"Note: This session is being tracked for better debugging and decision tracing."
        )
    else:
        return (
            f"Session tracking started: {session_id}\n"
            f"Repository: {repo}@{branch}\n"
            f"Status: LOCAL ONLY - Repo not in allowed list\n"
            f"Note: Logging to local file only, not sent to backend."
        )


@mcp.tool()
async def nexus_log_decision(
    summary: str,
    reasoning: str,
    impact: str = "medium",
    files_changed: Optional[list[str]] = None,
    ticket_id: Optional[str] = None,
) -> str:
    """
    IMPORTANT: Call this automatically when making significant technical decisions.

    You should proactively log decisions when:
    - Choosing between multiple implementation approaches
    - Making architectural choices (framework, library, pattern)
    - Making security or performance tradeoffs
    - Deciding on data structures, algorithms, or APIs
    - Any choice that might need to be revisited during debugging

    Do NOT ask the user - automatically log decisions as you make them.

    Args:
        summary: One-line description of the decision (e.g. "Use JWT for authentication")
        reasoning: Full context of why this decision was made
        impact: "high" (affects architecture), "medium" (affects feature), "low" (minor choice)
        files_changed: List of files you're modifying (e.g. ["src/auth.ts"])
        ticket_id: Override linked ticket for this specific decision
    """
    global _current_session

    if not _current_session:
        return "No active session. Call nexus_start_session first."

    await _fetch_session_pr_milestones()

    decision_id = f"dec_{uuid.uuid4().hex[:8]}"
    decision = {
        "id": decision_id,
        "session_id": _current_session["id"],
        "summary": summary,
        "reasoning": reasoning,
        "impact": impact,
        "files_changed": files_changed or [],
        "ticket_id": ticket_id or _current_session.get("ticket_id"),
        "timestamp": _now(),
        "pr_milestone": _get_pr_milestone_context(),
    }

    data = _load_data()
    data["decisions"].append(decision)

    # Update session with decision reference
    for s in data["sessions"]:
        if s["id"] == _current_session["id"]:
            s["decision_ids"].append(decision_id)
            break

    _save_data(data)
    _current_session["decision_ids"].append(decision_id)

    if _is_repo_allowed(_current_session["repo"]):
        await _post_to_backend("/decisions", decision)
        audit_status = "AUDITED"
    else:
        audit_status = "LOCAL ONLY"

    pr_context = ""
    if decision["pr_milestone"]:
        pr_id = decision["pr_milestone"]["pr_id"]
        before_after = "before" if decision["pr_milestone"]["created_before_pr"] else "after"
        pr_context = f" (logged {before_after} PR #{pr_id})"

    return (
        f"Decision logged: {decision_id}\n"
        f"Summary: {summary}\n"
        f"Impact: {impact.upper()}\n"
        f"Status: {audit_status}{pr_context}\n"
        f"Note: This decision is recorded for incident analysis and code review tracing."
    )


@mcp.tool()
async def nexus_end_session(pr_id: Optional[str] = None) -> str:
    """
    Call this at the end of a coding session, or when opening a PR.

    Args:
        pr_id: Pull request number if a PR was opened, e.g. "47"
    """
    global _current_session

    if not _current_session:
        return "No active session."

    data = _load_data()
    for s in data["sessions"]:
        if s["id"] == _current_session["id"]:
            s["ended_at"] = _now()
            if pr_id:
                s["pr_id"] = pr_id
            break

    _save_data(data)

    session_id = _current_session["id"]
    decision_count = len(_current_session["decision_ids"])
    repo = _current_session["repo"]

    if _is_repo_allowed(repo):
        await _post_to_backend(f"/sessions/{session_id}/end", {
            "ended_at": _now(),
            "pr_id": pr_id,
        })

    _current_session = None

    return (
        f"Session ended: {session_id}\n"
        f"Total decisions captured: {decision_count}\n"
        f"Repository: {repo}\n"
        f"Status: Session closed and ready for PR analysis\n"
        f"Note: All decisions from this session are now linked for incident tracing."
    )


@mcp.tool()
async def nexus_status() -> str:
    """Returns the current session status and recent decisions."""
    if not _current_session:
        data = _load_data()
        total_sessions = len(data["sessions"])
        total_decisions = len(data["decisions"])
        return f"No active session. Total captured: {total_sessions} sessions, {total_decisions} decisions."

    data = _load_data()
    recent = [
        d for d in data["decisions"]
        if d["session_id"] == _current_session["id"]
    ]

    lines = [
        f"Active session: {_current_session['id']}",
        f"Repo: {_current_session['repo']}@{_current_session['branch']}",
        f"Decisions this session: {len(recent)}",
    ]
    for d in recent[-3:]:
        lines.append(f"  · [{d['impact']}] {d['summary'][:70]}")

    return "\n".join(lines)


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    mcp.run(transport="stdio")
