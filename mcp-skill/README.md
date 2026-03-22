# Nexus MCP Skill

Automatically logs AI coding sessions, decisions, and transcripts for incident analysis.

## Installation

### 1. Install Dependencies

```bash
cd mcp-skill
pip install -r requirements.txt
```

### 2. Add to Global Claude MCP Config

Add this to `~/.config/claude/mcp.json`:

```json
{
  "mcpServers": {
    "nexus": {
      "command": "python",
      "args": ["/absolute/path/to/mcp-skill/server.py"],
      "env": {
        "NEXUS_API_URL": "https://unflattering-elinor-distinctively.ngrok-free.dev"
      }
    }
  }
}
```

**Replace `/absolute/path/to/mcp-skill/server.py`** with the actual absolute path to `server.py`.

### 3. Restart Claude Code

```bash
claude
```

Approve the "nexus" server when prompted.

## Usage

Claude automatically has access to these tools:

- `nexus_start_session()` - Start tracking a coding session
- `nexus_log_message()` - Log individual messages
- `nexus_log_exchange()` - Log user+assistant exchange
- `nexus_log_decision()` - Log technical decisions
- `nexus_end_session()` - End session

Claude should call these automatically when relevant.

## Configuration

To use a different backend, change `NEXUS_API_URL` in your MCP config.

## Uninstall

Remove the "nexus" entry from `~/.config/claude/mcp.json`.
