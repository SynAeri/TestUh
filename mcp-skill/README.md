# Nexus MCP Skill

Claude Code skill that captures AI coding decisions in real time and saves them for incident tracing.

## Install

```bash
cd mcp-skill
pip install -r requirements.txt
```

## Add to Claude Code

Edit `~/.claude/claude_desktop_config.json` (or Claude Code MCP settings):

```json
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
```

`NEXUS_API_URL` is optional — if not set, data is saved locally to `sessions.json` only.

## Tools Claude can call

| Tool | When | What it does |
|---|---|---|
| `nexus_start_session` | Start of coding | Creates session with repo/branch/ticket |
| `nexus_log_decision` | Each key decision | Saves summary + full reasoning + files |
| `nexus_end_session` | PR opened / done | Closes session, links PR number |
| `nexus_status` | Anytime | Shows current session + recent decisions |

## Data saved

All data is saved to `mcp-skill/sessions.json`:

```json
{
  "sessions": [
    {
      "id": "sess_a4b3c2d1",
      "repo": "acme/api-server",
      "branch": "feat/jwt-migration",
      "agent": "claude",
      "engineer": "james.chen",
      "ticket_id": "LIN-247",
      "started_at": "2026-03-21T10:00:00Z",
      "ended_at": "2026-03-21T11:23:00Z",
      "pr_id": "47",
      "decision_ids": ["dec_x1y2z3"]
    }
  ],
  "decisions": [
    {
      "id": "dec_x1y2z3",
      "session_id": "sess_a4b3c2d1",
      "summary": "Switched to jose library for JWT handling",
      "reasoning": "The existing jsonwebtoken library...",
      "impact": "high",
      "files_changed": ["src/auth.ts", "middleware/validate.ts"],
      "ticket_id": "LIN-247",
      "timestamp": "2026-03-21T10:34:00Z"
    }
  ]
}
```

## Backend endpoints expected (when ready)

```
POST /sessions          → create session
POST /decisions         → log decision
POST /sessions/:id/end  → close session
```
