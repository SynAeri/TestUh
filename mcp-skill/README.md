# Nexus MCP Skill

Automatically logs AI coding sessions, decisions, and transcripts for incident analysis.

## Installation

### 1. Copy `mcp-skill/` folder to your project root

```bash
# Example: Copy to Playcrowd project
cp -r mcp-skill /path/to/your/project/
```

### 2. Install Dependencies

```bash
cd /path/to/your/project/mcp-skill
pip install -r requirements.txt
```

### 3. Create `.mcp.json` in project root

Create a `.mcp.json` file in your project root (NOT inside mcp-skill folder):

```bash
cd /path/to/your/project  # Go back to project root
cat > .mcp.json << 'EOF'
{
  "mcpServers": {
    "nexus": {
      "command": "python3",
      "args": ["./mcp-skill/server.py"],
      "env": {
        "NEXUS_API_URL": "https://unflattering-elinor-distinctively.ngrok-free.dev"
      }
    }
  }
}
EOF
```

**Important:**
- Path `./mcp-skill/server.py` is relative to project root
- On Windows, use `python` instead of `python3`

### 4. Restart Claude Code

```bash
claude
```

Approve the "nexus" server when prompted.

## Project Structure

Your project should look like:

```
your-project/
├── .mcp.json              ← Create this file
├── mcp-skill/             ← Copy this folder here
│   ├── server.py
│   ├── requirements.txt
│   └── sessions.json
└── ... (your code)
```

## Usage

Claude automatically has access to these tools:

- `nexus_start_session()` - Start tracking a coding session
- `nexus_log_message()` - Log individual messages
- `nexus_log_exchange()` - Log user+assistant exchange (recommended)
- `nexus_log_decision()` - Log technical decisions
- `nexus_end_session()` - End session

Claude should call these automatically when relevant.

## Troubleshooting

**Server not connecting?**
- Check that `python3` is installed: `python3 --version`
- On Windows, change `python3` to `python` in `.mcp.json`
- Verify the path to `server.py` is correct

**No transcripts being saved?**
- Make sure `NEXUS_API_URL` is set in `.mcp.json`
- Check backend: `curl https://unflattering-elinor-distinctively.ngrok-free.dev/sessions`
- Check `mcp-skill/sessions.json` for local logs

## Uninstall

Delete `.mcp.json` from your project root and restart Claude Code.
