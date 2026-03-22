# Full Transcript Logging Guide

The MCP skill now captures complete conversation transcripts between you and Claude during coding sessions.

## What Gets Logged

**Every message in the conversation:**
- User questions and requests
- Claude's responses and explanations
- Tool use conversations
- Code snippets shared in chat
- Debugging discussions
- Architecture discussions

## How It Works

1. **Start a Session** (automatic)
   - Claude calls `nexus_start_session` when you begin coding work
   - Session tracks repo, branch, and start time

2. **Log Every Message** (automatic)
   - Claude calls `nexus_log_message` after every user message
   - Claude calls `nexus_log_message` after every response it generates
   - Messages are timestamped and linked to the session

3. **End Session** (manual or automatic)
   - Call `nexus_end_session` when PR is created or work is done
   - Or let it continue across multiple sessions

## Claude's Auto-Logging Behavior

Claude should automatically log messages like this:

```
User: "Can you help me add authentication to the API?"
→ Claude logs: nexus_log_message(role="user", content="Can you help me add authentication to the API?")

Claude: "I'll help you add authentication. Let me start by creating a JWT middleware..."
→ Claude logs: nexus_log_message(role="assistant", content="I'll help you add authentication...")

User: "Should we use sessions or tokens?"
→ Claude logs: nexus_log_message(role="user", content="Should we use sessions or tokens?")

Claude: "For a stateless API, JWT tokens are better because..."
→ Claude logs: nexus_log_message(role="assistant", content="For a stateless API...")
```

## Viewing Transcripts

### Get Full Session Transcript
```bash
curl http://localhost:8000/transcripts/sess_abc123
```

Returns:
```json
{
  "session_id": "sess_abc123",
  "total_messages": 47,
  "messages": [
    {
      "id": "msg_xyz789",
      "session_id": "sess_abc123",
      "role": "user",
      "content": "Can you help me add authentication to the API?",
      "message_type": "chat",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "id": "msg_abc456",
      "session_id": "sess_abc123",
      "role": "assistant",
      "content": "I'll help you add authentication. Let me start by...",
      "message_type": "chat",
      "timestamp": "2024-01-15T10:30:05Z"
    }
  ]
}
```

### List All Sessions with Transcripts
```bash
curl http://localhost:8000/transcripts
```

Returns:
```json
{
  "total_sessions": 3,
  "sessions": [
    {
      "session_id": "sess_abc123",
      "message_count": 47,
      "first_message_at": "2024-01-15T10:30:00Z",
      "last_message_at": "2024-01-15T11:45:00Z"
    }
  ]
}
```

## Local Storage

Transcripts are also saved locally in `mcp-skill/sessions.json`:

```json
{
  "sessions": [...],
  "decisions": [...],
  "transcripts": [
    {
      "id": "msg_xyz789",
      "session_id": "sess_abc123",
      "role": "user",
      "content": "Can you help me add authentication?",
      "message_type": "chat",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Use Cases

### 1. Incident Debugging
When a bug appears in production:
- Look up the transcript for the session that created the code
- See the exact conversation where decisions were made
- Understand why a particular approach was chosen

### 2. Code Review Context
Before reviewing a PR:
- Read the full transcript of how the code was developed
- See what alternatives were considered
- Understand the reasoning behind implementation choices

### 3. Knowledge Transfer
For new team members:
- Read transcripts of how features were built
- Learn the thought process behind architectural decisions
- See real conversations about tradeoffs

### 4. Audit Trail
For compliance:
- Complete record of AI involvement in code changes
- Timestamps showing when decisions were made
- Full context of human oversight and approval

## Privacy & Security

**What IS logged:**
- Your questions and requests to Claude
- Claude's responses and code suggestions
- Technical discussions about implementation

**What is NOT logged:**
- Passwords or API keys (should never be in chat anyway)
- Files outside the conversation (only what's in chat)
- Git commits or actual file changes (those are tracked separately)

**Storage:**
- Local: `sessions.json` file (plaintext, gitignored)
- Remote: Backend `/transcripts` endpoint (if repo is allowed)

## Disabling Transcript Logging

If you don't want full transcripts logged for a particular session:

**Option 1:** Don't call `nexus_log_message`
- Claude only logs if it calls the tool
- You can ask Claude not to log messages for sensitive discussions

**Option 2:** Use a non-allowed repo
- Transcripts for non-allowed repos stay local only
- They won't be sent to the backend

**Option 3:** Remove transcript tracking entirely
- Comment out the `nexus_log_message` tool in `server.py`
- Restart the MCP server

## Example Session Flow

```
1. User starts coding:
   "Help me build a payment processing feature"

2. Claude starts session:
   nexus_start_session(repo="myapp", branch="feat/payments")

3. Conversation begins:
   User: "Should we use Stripe or Square?"
   → nexus_log_message(role="user", content="Should we use Stripe or Square?")

   Claude: "Stripe has better API docs and more features..."
   → nexus_log_message(role="assistant", content="Stripe has better API docs...")

   User: "OK let's use Stripe. Can you set up the integration?"
   → nexus_log_message(role="user", content="OK let's use Stripe...")

   Claude: "I'll create the Stripe integration..."
   → nexus_log_message(role="assistant", content="I'll create the Stripe...")
   → nexus_log_decision(summary="Use Stripe for payments", reasoning="...")

4. Work continues with full transcript...

5. PR created:
   nexus_end_session(pr_id="123")
   → Transcript now linked to PR #123
```

Now when reviewing PR #123, you can read the entire conversation that led to the implementation!

## Backend API Endpoints

### POST /transcripts
Log a single message from the conversation.

**Request:**
```json
{
  "id": "msg_xyz789",
  "session_id": "sess_abc123",
  "role": "user",
  "content": "Can you help me add authentication?",
  "message_type": "chat",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Response:**
```json
{
  "status": "logged",
  "transcript_id": "msg_xyz789",
  "session_id": "sess_abc123"
}
```

### GET /transcripts/{session_id}
Get full transcript for a session.

**Response:**
```json
{
  "session_id": "sess_abc123",
  "messages": [...],
  "total_messages": 47
}
```

### GET /transcripts
List all sessions with transcript summaries.

**Response:**
```json
{
  "total_sessions": 3,
  "sessions": [
    {
      "session_id": "sess_abc123",
      "message_count": 47,
      "first_message_at": "2024-01-15T10:30:00Z",
      "last_message_at": "2024-01-15T11:45:00Z"
    }
  ]
}
```
