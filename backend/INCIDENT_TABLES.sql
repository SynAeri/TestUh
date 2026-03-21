-- Supabase Tables for AI-Powered Incident Response Platform
-- Run these SQL commands in Supabase SQL Editor to create the incident management schema

-- ===============================
-- INCIDENTS TABLE
-- ===============================
CREATE TABLE IF NOT EXISTS incidents (
    incident_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    symptoms TEXT NOT NULL,
    impacted_service TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL CHECK (status IN ('open', 'investigating', 'resolved')) DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,

    -- Links to other entities
    deployment_id TEXT,
    pr_id TEXT,
    session_id TEXT REFERENCES ai_sessions(id),

    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX idx_incidents_session ON incidents(session_id);

COMMENT ON TABLE incidents IS 'Production incidents with links to AI sessions, PRs, and deployments';

-- ===============================
-- DEPLOYMENTS TABLE
-- ===============================
CREATE TABLE IF NOT EXISTS deployments (
    deployment_id TEXT PRIMARY KEY,
    commit_sha TEXT NOT NULL,
    environment TEXT NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
    service_name TEXT NOT NULL,
    deployed_by TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')) DEFAULT 'success',

    pr_id TEXT,
    session_id TEXT REFERENCES ai_sessions(id),

    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_deployments_environment ON deployments(environment);
CREATE INDEX idx_deployments_timestamp ON deployments(timestamp DESC);
CREATE INDEX idx_deployments_pr ON deployments(pr_id);
CREATE INDEX idx_deployments_session ON deployments(session_id);

COMMENT ON TABLE deployments IS 'Deployment records linked to AI sessions and PRs';

-- ===============================
-- PULL REQUESTS TABLE
-- ===============================
CREATE TABLE IF NOT EXISTS pull_requests (
    pr_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    author TEXT NOT NULL,
    commit_sha TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'merged', 'closed')) DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    merged_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,

    session_id TEXT REFERENCES ai_sessions(id),

    files_changed TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_prs_status ON pull_requests(status);
CREATE INDEX idx_prs_author ON pull_requests(author);
CREATE INDEX idx_prs_session ON pull_requests(session_id);

COMMENT ON TABLE pull_requests IS 'Pull requests linked to AI coding sessions';

-- ===============================
-- FIX DRAFTS TABLE
-- ===============================
CREATE TABLE IF NOT EXISTS fix_drafts (
    draft_id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL REFERENCES incidents(incident_id),
    analysis TEXT NOT NULL,
    probable_cause TEXT NOT NULL,
    proposed_fix TEXT NOT NULL,
    patch_notes TEXT NOT NULL,
    code_changes TEXT,
    reviewer TEXT,
    review_state TEXT NOT NULL CHECK (review_state IN ('pending', 'in_review', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_fix_drafts_incident ON fix_drafts(incident_id);
CREATE INDEX idx_fix_drafts_review_state ON fix_drafts(review_state);

COMMENT ON TABLE fix_drafts IS 'AI-generated fixes for incidents';

-- ===============================
-- HELPER VIEWS
-- ===============================

-- View: Incidents with full context (joins sessions, PRs, deployments)
CREATE OR REPLACE VIEW incidents_with_context AS
SELECT
    i.*,
    s.repo,
    s.branch,
    s.engineer,
    s.started_at as session_started_at,
    s.decision_count,
    pr.title as pr_title,
    pr.author as pr_author,
    pr.commit_sha,
    pr.files_changed,
    pr.merged_at,
    d.environment as deployment_environment,
    d.deployed_by,
    d.timestamp as deployment_timestamp
FROM incidents i
LEFT JOIN ai_sessions s ON i.session_id = s.id
LEFT JOIN pull_requests pr ON i.pr_id = pr.pr_id
LEFT JOIN deployments d ON i.deployment_id = d.deployment_id;

COMMENT ON VIEW incidents_with_context IS 'Incidents with all related context from sessions, PRs, and deployments';

-- ===============================
-- FUNCTIONS
-- ===============================

-- Function to get incident timeline
CREATE OR REPLACE FUNCTION get_incident_timeline(p_incident_id TEXT)
RETURNS TABLE (
    event_type TEXT,
    event_timestamp TIMESTAMPTZ,
    event_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'incident_created' as event_type, i.created_at as event_timestamp,
           jsonb_build_object('incident_id', i.incident_id, 'title', i.title, 'severity', i.severity) as event_data
    FROM incidents i WHERE i.incident_id = p_incident_id
    UNION ALL
    SELECT 'session_started', s.started_at::timestamptz,
           jsonb_build_object('session_id', s.id, 'repo', s.repo, 'branch', s.branch, 'engineer', s.engineer)
    FROM incidents i
    JOIN ai_sessions s ON i.session_id = s.id
    WHERE i.incident_id = p_incident_id AND s.started_at IS NOT NULL
    UNION ALL
    SELECT 'pr_created', pr.created_at,
           jsonb_build_object('pr_id', pr.pr_id, 'title', pr.title, 'author', pr.author)
    FROM incidents i
    JOIN pull_requests pr ON i.pr_id = pr.pr_id
    WHERE i.incident_id = p_incident_id
    UNION ALL
    SELECT 'pr_merged', pr.merged_at,
           jsonb_build_object('pr_id', pr.pr_id, 'commit_sha', pr.commit_sha)
    FROM incidents i
    JOIN pull_requests pr ON i.pr_id = pr.pr_id
    WHERE i.incident_id = p_incident_id AND pr.merged_at IS NOT NULL
    UNION ALL
    SELECT 'deployed', d.timestamp,
           jsonb_build_object('deployment_id', d.deployment_id, 'environment', d.environment, 'deployed_by', d.deployed_by)
    FROM incidents i
    JOIN deployments d ON i.deployment_id = d.deployment_id
    WHERE i.incident_id = p_incident_id
    ORDER BY event_timestamp;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_incident_timeline IS 'Get chronological timeline of events for an incident';

-- ===============================
-- DISABLE RLS FOR DEMO
-- ===============================
ALTER TABLE incidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE deployments DISABLE ROW LEVEL SECURITY;
ALTER TABLE pull_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE fix_drafts DISABLE ROW LEVEL SECURITY;

-- ===============================
-- VERIFICATION QUERIES
-- ===============================

-- Check all tables were created
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('incidents', 'deployments', 'pull_requests', 'fix_drafts', 'ai_sessions', 'ai_decisions')
ORDER BY table_name;

-- Verify foreign key relationships
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('incidents', 'deployments', 'pull_requests', 'fix_drafts');
