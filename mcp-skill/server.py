"""
Nexus MCP Skill — Claude Code decision capture server

Runs alongside Claude Code. Claude calls these tools automatically
during coding sessions to capture decisions, reasoning, and context.

Data is saved locally to sessions.json and optionally POSTed to
the Nexus backend API when NEXUS_API_URL is set.

Setup (add to your Claude Code config):
  {
    "mcpServers": {
      "nexus": {
        "command": "python",
        "args": ["/path/to/mcp-skill/server.py"],
        "env": {
          "NEXUS_API_URL": "https://your-api.com"  // optional
        }
      }
    }
  }
"""

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx
from mcp.server.fastmcp import FastMCP

# ── Config ────────────────────────────────────────────────────────────────────

NEXUS_API_URL = os.getenv("NEXUS_API_URL", "").rstrip("/")
DATA_FILE = Path(__file__).parent / "sessions.json"

mcp = FastMCP("nexus-skill")

# ── In-memory state ───────────────────────────────────────────────────────────

_current_session: dict | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load_data() -> dict:
    if DATA_FILE.exists():
        return json.loads(DATA_FILE.read_text())
    return {"sessions": [], "decisions": []}


def _save_data(data: dict) -> None:
    DATA_FILE.write_text(json.dumps(data, indent=2, default=str))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


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
    Call this at the start of a coding session.

    Args:
        repo: Repository name, e.g. "acme/api-server"
        branch: Git branch, e.g. "feat/jwt-migration"
        agent: AI agent being used, e.g. "claude", "codex", "cursor"
        engineer: Engineer username, e.g. "james.chen"
        ticket_id: Linked Linear/Jira ticket, e.g. "LIN-247"
    """
    global _current_session

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

    await _post_to_backend("/sessions", _current_session)

    return f"Nexus session started: {session_id} on {repo}@{branch}"


@mcp.tool()
async def nexus_log_decision(
    summary: str,
    reasoning: str,
    impact: str = "medium",
    files_changed: Optional[list[str]] = None,
    ticket_id: Optional[str] = None,
) -> str:
    """
    Call this when making a significant architectural or implementation decision.
    Captures the decision and the reasoning behind it for future incident tracing.

    Args:
        summary: One-line description of the decision made
        reasoning: Why this decision was made — the full context
        impact: "high", "medium", or "low"
        files_changed: List of files affected, e.g. ["src/auth.ts", "middleware.ts"]
        ticket_id: Override linked ticket for this specific decision
    """
    global _current_session

    if not _current_session:
        return "No active session. Call nexus_start_session first."

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

    await _post_to_backend("/decisions", decision)

    return f"Decision logged: {decision_id} [{impact}] — {summary[:60]}"


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

    await _post_to_backend(f"/sessions/{session_id}/end", {
        "ended_at": _now(),
        "pr_id": pr_id,
    })

    _current_session = None

    return f"Session {session_id} ended. {decision_count} decision(s) captured."


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
