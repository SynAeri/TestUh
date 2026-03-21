-- AI Session Logging Tables for MCP Skill Integration
-- This script creates tables to store Claude's coding sessions and decisions
-- Linked to incidents and PRs for full traceability

-- Sessions table: tracks each coding session
CREATE TABLE IF NOT EXISTS ai_sessions (
    id TEXT PRIMARY KEY,
    repo TEXT NOT NULL,
    branch TEXT NOT NULL,
    agent TEXT NOT NULL DEFAULT 'claude',
    engineer TEXT,
    ticket_id TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    pr_id TEXT,
    decision_count INTEGER DEFAULT 0,
    metadata JSONB
);

-- Decisions table: captures architectural and implementation decisions
CREATE TABLE IF NOT EXISTS ai_decisions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    impact TEXT NOT NULL CHECK (impact IN ('low', 'medium', 'high')),
    files_changed TEXT[],
    ticket_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    metadata JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_sessions_repo ON ai_sessions(repo);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_branch ON ai_sessions(branch);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_pr_id ON ai_sessions(pr_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_ticket_id ON ai_sessions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_started_at ON ai_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_ai_decisions_session_id ON ai_decisions(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_ticket_id ON ai_decisions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_impact ON ai_decisions(impact);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_timestamp ON ai_decisions(timestamp);

-- GIN indexes for metadata JSONB
CREATE INDEX IF NOT EXISTS idx_ai_sessions_metadata ON ai_sessions USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_metadata ON ai_decisions USING GIN (metadata);

-- Comments
COMMENT ON TABLE ai_sessions IS 'AI coding sessions tracked by MCP skill';
COMMENT ON TABLE ai_decisions IS 'Architectural and implementation decisions made during AI coding sessions';

COMMENT ON COLUMN ai_sessions.id IS 'Unique session ID (e.g., sess_a4b3c2d1)';
COMMENT ON COLUMN ai_sessions.repo IS 'Repository name (e.g., acme/api-server)';
COMMENT ON COLUMN ai_sessions.branch IS 'Git branch name';
COMMENT ON COLUMN ai_sessions.agent IS 'AI agent used (e.g., claude, codex)';
COMMENT ON COLUMN ai_sessions.engineer IS 'Engineer username';
COMMENT ON COLUMN ai_sessions.ticket_id IS 'Linked ticket/issue ID';
COMMENT ON COLUMN ai_sessions.pr_id IS 'Pull request ID if created';

COMMENT ON COLUMN ai_decisions.id IS 'Unique decision ID (e.g., dec_x1y2z3)';
COMMENT ON COLUMN ai_decisions.session_id IS 'Parent session ID';
COMMENT ON COLUMN ai_decisions.summary IS 'One-line decision summary';
COMMENT ON COLUMN ai_decisions.reasoning IS 'Full context and reasoning';
COMMENT ON COLUMN ai_decisions.impact IS 'Impact level: low, medium, or high';
COMMENT ON COLUMN ai_decisions.files_changed IS 'Array of affected file paths';

-- Disable RLS for hackathon demo (enable for production)
ALTER TABLE ai_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decisions DISABLE ROW LEVEL SECURITY;
