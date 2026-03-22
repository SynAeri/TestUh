# Nexus MCP Skill - Team Setup Guide

## How Other Users Can Use This

This guide explains how anyone on your team (or in other projects like Playcrowd) can use the Nexus MCP skill for transcript logging.

## Quick Answer

**For a user to use this, they need:**
1. Copy of the `mcp-skill/` directory
2. A `.mcp.json` file in their project (OR global MCP config)
3. Transcript logging rules in their `CLAUDE.md`

## Setup Options

### Option 1: Shared Installation (Recommended for Teams)

**Best for**: Teams working on the same backend, like your Testah/Playcrowd setup.

#### Step 1: One-Time Team Setup

1. Put the `mcp-skill/` directory in a shared location that everyone can access:
   - On a shared network drive: `/shared/tools/nexus-mcp-skill/`
   - Or in each user's home: `~/nexus-mcp-skill/` (everyone copies it once)

2. Install Python dependencies:
   ```bash
   cd /path/to/mcp-skill
   pip install -r requirements.txt
   ```

#### Step 2: Each User Adds MCP Config

**Option A: Global Config** (works for all projects)

Create or edit `~/.config/claude/mcp.json`:

```json
{
  "mcpServers": {
    "nexus": {
      "command": "python",
      "args": ["/shared/tools/nexus-mcp-skill/server.py"],
      "env": {
        "NEXUS_API_URL": "https://unflattering-elinor-distinctively.ngrok-free.dev"
      }
    }
  }
}
```

**Option B: Project Config** (only for this project)

Create `.mcp.json` in project root (Testah, Playcrowd, etc.):

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

#### Step 3: Add Transcript Logging Rules

Each user adds to their `~/.claude/CLAUDE.md` (global rules):

```markdown
## Transcript Logging (Nexus MCP Skill)
- When working in repos with active Nexus session tracking, you MUST log all conversations
- After EVERY user message, call: nexus_log_message(role="user", content="[their message]")
- After EVERY response you generate, call: nexus_log_message(role="assistant", content="[your response]")
- Alternatively, use: nexus_log_exchange(user_message="...", assistant_response="...")
- This is REQUIRED for incident analysis and debugging
```

#### Step 4: Start Using It

```bash
cd /path/to/playcrowd  # or testah, or any project
claude
```

Claude Code will:
1. Ask to approve the "nexus" MCP server (first time only)
2. Start the server automatically
3. Make nexus tools available

Then in the conversation:
```
Start a coding session for Playcrowd on the main branch
```

### Option 2: Git Submodule (Best for Open Source)

**Best for**: Projects where the MCP skill should live in the repo itself.

#### Step 1: Add as Submodule

```bash
cd /path/to/playcrowd
git submodule add <git-repo-url-for-nexus-mcp> .mcp-servers/nexus
git commit -m "Add Nexus MCP skill"
```

#### Step 2: Add .mcp.json to Project

Create `.mcp.json` in project root:

```json
{
  "mcpServers": {
    "nexus": {
      "command": "python",
      "args": [".mcp-servers/nexus/server.py"],
      "env": {
        "NEXUS_API_URL": "https://unflattering-elinor-distinctively.ngrok-free.dev"
      }
    }
  }
}
```

Commit this file:
```bash
git add .mcp.json
git commit -m "Add Nexus MCP configuration"
```

#### Step 3: Add CLAUDE.md to Project

Create `CLAUDE.md` in project root with transcript logging rules (same as above).

Commit it:
```bash
git add CLAUDE.md
git commit -m "Add Claude Code instructions for transcript logging"
```

#### Step 4: Team Members Clone and Use

Anyone who clones the repo now has everything:

```bash
git clone <playcrowd-repo>
cd playcrowd
git submodule update --init  # Get the MCP skill

# Install dependencies
cd .mcp-servers/nexus
pip install -r requirements.txt
cd ../..

# Start Claude Code
claude
```

No manual setup needed - it just works!

### Option 3: Standalone Package (Advanced)

**Best for**: Large organizations with many projects.

Package the MCP skill as a Python package or npm package that can be installed globally.

## For Playcrowd Specifically

Since you're asking about Playcrowd, here's the easiest approach:

### Quick Setup for Playcrowd Team

1. **Add `.mcp.json` to Playcrowd repo** (root directory):

```json
{
  "mcpServers": {
    "nexus": {
      "command": "python",
      "args": ["/home/jordanm/Documents/Github/Testah/mcp-skill/server.py"],
      "env": {
        "NEXUS_API_URL": "https://unflattering-elinor-distinctively.ngrok-free.dev"
      }
    }
  }
}
```

2. **Add `CLAUDE.md` to Playcrowd repo**:

```markdown
# Claude Code Rules for Playcrowd

## Transcript Logging
- Call nexus_start_session() when beginning coding work
- Call nexus_log_exchange() after every user/assistant exchange
- This is required for incident debugging
```

3. **Commit both files**:

```bash
cd /path/to/playcrowd
git add .mcp.json CLAUDE.md
git commit -m "Add Nexus MCP skill for transcript logging"
git push
```

4. **Team members pull and start coding**:

```bash
cd /path/to/playcrowd
git pull
claude
```

Claude Code will automatically:
- Detect `.mcp.json`
- Ask to approve the nexus server
- Start it when Claude Code starts
- Load rules from `CLAUDE.md`

## Configuration Per User/Project

### Different Backend URLs

If different users need different backends:

```json
{
  "mcpServers": {
    "nexus": {
      "command": "python",
      "args": ["/path/to/mcp-skill/server.py"],
      "env": {
        "NEXUS_API_URL": "${NEXUS_BACKEND_URL}"
      }
    }
  }
}
```

Then each user sets in their shell:
```bash
export NEXUS_BACKEND_URL="https://their-backend.com"
```

### Only Track Certain Repos

Set in `.mcp.json`:

```json
{
  "env": {
    "NEXUS_API_URL": "https://unflattering-elinor-distinctively.ngrok-free.dev",
    "NEXUS_ALLOWED_REPOS": "Playcrowd,Testah"
  }
}
```

Now transcripts are only logged for Playcrowd and Testah, not other repos.

## Troubleshooting

### "I don't see nexus tools available"

1. Check `.mcp.json` exists in project root OR global MCP config
2. Restart Claude Code
3. Check for approval prompt - you may need to accept the MCP server

### "Command not found: python"

Update `.mcp.json` to use `python3`:

```json
{
  "mcpServers": {
    "nexus": {
      "command": "python3",
      ...
    }
  }
}
```

### "Path doesn't exist"

Make sure the path in `args` is absolute:
- ✅ `/home/jordanm/Documents/Github/Testah/mcp-skill/server.py`
- ❌ `./mcp-skill/server.py`
- ❌ `~/mcp-skill/server.py` (shell expansion doesn't work)

### "No transcripts being saved"

1. Check backend is accessible:
   ```bash
   curl https://unflattering-elinor-distinctively.ngrok-free.dev/sessions
   ```

2. Verify Claude is calling the logging tools - watch for tool output:
   ```
   Message logged: msg_abc123 (user)
   ```

3. Check `CLAUDE.md` has transcript logging rules

## Summary

**To use Nexus MCP skill in any project:**

1. **One person**: Set up `mcp-skill/` directory somewhere accessible
2. **Each user**: Add `.mcp.json` pointing to that directory
3. **Each user**: Add transcript logging rules to `CLAUDE.md`
4. **Everyone**: Restart Claude Code and start logging!

**For Playcrowd specifically:**
- Add `.mcp.json` and `CLAUDE.md` to the repo
- Everyone who pulls the repo gets it automatically
- Point to the same backend URL for shared incident tracking
