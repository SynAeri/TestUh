# Auto-Session Tracking Guide

This document explains how Claude automatically tracks coding sessions using the updated MCP skill prompts.

## How It Works Now

The MCP skill tool descriptions have been updated with **IMPORTANT** markers that instruct Claude to proactively call session tracking functions.

### Updated Tool Behaviors

**nexus_start_session:**
- Claude will automatically call this when you ask it to code
- Detects repo/branch from git context
- No user input needed

**nexus_log_decision:**
- Claude automatically logs decisions as it makes them
- Tracks architectural choices, library selections, tradeoffs
- No user input needed

**nexus_end_session:**
- Still manual (call when finishing work or creating PR)

## Example Session Flow

```
User: "Build me an authentication system"

Claude (internally):
1. Runs: git remote -v → gets "SynAeri/Playcrowd"
2. Runs: git branch --show-current → gets "feat/auth"
3. Calls: nexus_start_session(repo="SynAeri/Playcrowd", branch="feat/auth")
4. Responds: "I'll build an auth system. I'm using JWT because..."
5. Calls: nexus_log_decision(summary="Use JWT for auth", reasoning="...")
6. Writes code...
7. Calls: nexus_log_decision(summary="Use bcrypt for passwords", ...)
8. More code...

User: "I created a PR"
Claude: Calls nexus_end_session(pr_id="42")
```

## Reliability Concerns

### What Works Well
✓ Claude can read git context (repo, branch)
✓ Claude can detect when significant work starts
✓ Claude can identify architectural decisions
✓ Tool descriptions guide behavior

### What Doesn't Always Work
✗ Claude might forget to call functions (not 100% reliable)
✗ Can't enforce automatic behavior (relies on LLM interpretation)
✗ Different Claude conversations won't share session state
✗ Depends on Claude "noticing" the tool instructions

### Reliability Estimate
**~60-80% automatic** - Claude will usually remember, but not always.

## When Claude Might NOT Auto-Start

**Scenarios where auto-start might fail:**
- Very short interactions ("fix this typo")
- Conversations that start casual then become technical
- When Claude doesn't recognize work as "significant"
- If context window is very full (tool descriptions get deprioritized)

## How to Improve Reliability

**Option A: Remind Claude**
```
User: "Start tracking this work session"
User: "Initialize nexus tracking"
```

**Option B: Add to your prompts**
```
User: "Build auth (and track the session)"
User: "Help me debug this (log decisions)"
```

**Option C: Create a Claude Code Hook**
Add to `~/.claude/hooks/session-start.sh`:
```bash
#!/bin/bash
# Auto-remind Claude to start tracking
echo "Remember to start a nexus session for this work"
```

## Testing Auto-Start

Try these commands with Claude:

```
"Build a new user registration feature"
→ Should auto-start session, log decisions

"Refactor the authentication middleware"
→ Should auto-start session, log decisions

"Fix typo in README"
→ Might NOT auto-start (too trivial)
```

Then check:
```bash
curl https://your-backend.com/sessions
# Should see new sessions
```

## Comparison: Manual vs Auto

### Manual (Old Way)
```
User: "Start nexus session"
Claude: nexus_start_session(...)
User: "Build auth"
Claude: *builds*
User: "Log that decision"
Claude: nexus_log_decision(...)
```

### Auto (New Way)
```
User: "Build auth"
Claude: nexus_start_session(...) *automatic*
Claude: *builds*
Claude: nexus_log_decision(...) *automatic*
```

## Fallback: Git Hooks (100% Reliable)

If auto-start isn't reliable enough, use git hooks instead:

```bash
# .git/hooks/pre-commit
#!/bin/bash
curl -X POST https://your-backend.com/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "id": "sess_'$(uuidgen | cut -d- -f1)'",
    "repo": "'$(git remote get-url origin | sed 's/.*://; s/.git//')'",
    "branch": "'$(git branch --show-current)'",
    "started_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'
```

This runs before every commit, 100% reliable.

## Recommendation

**Use hybrid approach:**
1. Let Claude auto-start (works most of the time)
2. Manually remind Claude when needed
3. Consider git hooks for critical projects

The updated tool descriptions make it **mostly automatic** but not **fully automatic**.
