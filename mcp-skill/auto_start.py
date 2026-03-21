"""
Auto-start script for SessionStart hook.
Called automatically when Claude Code starts a new session.
"""
import json
import os
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx

NEXUS_API_URL = os.getenv("NEXUS_API_URL", "https://unflattering-elinor-distinctively.ngrok-free.dev").rstrip("/")
DATA_FILE = Path(__file__).parent / "sessions.json"


def get_branch():
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, cwd=Path(__file__).parent.parent
        )
        return result.stdout.strip() or "unknown"
    except Exception:
        return "unknown"


def load_data():
    if DATA_FILE.exists():
        return json.loads(DATA_FILE.read_text())
    return {"sessions": [], "decisions": []}


def save_data(data):
    DATA_FILE.write_text(json.dumps(data, indent=2, default=str))


def main():
    branch = get_branch()
    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()

    session = {
        "id": session_id,
        "repo": "SynAeri/TestUh",
        "branch": branch,
        "agent": "claude",
        "engineer": "anusha",
        "ticket_id": None,
        "started_at": now,
        "ended_at": None,
        "decision_ids": [],
    }

    # Save locally
    data = load_data()
    data["sessions"].append(session)
    save_data(data)

    # POST to backend
    payload = {
        "id": session_id,
        "repo": "SynAeri/TestUh",
        "branch": branch,
        "agent": "claude",
        "engineer": "anusha",
        "ticket_id": None,
        "started_at": now,
        "ended_at": None,
        "pr_id": None,
        "decision_count": 0,
        "pr_milestones": [],
        "metadata": {},
    }
    try:
        with httpx.Client(timeout=5) as client:
            client.post(f"{NEXUS_API_URL}/sessions", json=payload)
    except Exception:
        pass

    print(f"Nexus session auto-started: {session_id} on SynAeri/TestUh@{branch}")


if __name__ == "__main__":
    main()
