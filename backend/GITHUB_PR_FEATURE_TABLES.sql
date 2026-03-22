-- SQL Migration for GitHub PR Feature
-- New tables to support LLM-generated fix PRs
-- Run this in Supabase SQL Editor after existing tables are created

-- ===============================
-- AI ANALYSES TABLE
-- ===============================
-- Stores LLM analysis results for incidents
-- Separate from fix_drafts for audit trail

CREATE TABLE IF NOT EXISTS ai_analyses (
    analysis_id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,

    -- Input packet sent to LLM (for reproducibility)
    input_packet JSONB NOT NULL,

    -- LLM output
    likely_cause TEXT NOT NULL,
    risky_assumptions TEXT[] NOT NULL,
    suggested_fix TEXT NOT NULL,
    recommended_reviewer TEXT,

    -- Metadata
    model_used TEXT NOT NULL, -- 'gemini-2.5-flash', 'claude-3-5-sonnet', etc
    tokens_used INTEGER,
    latency_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_incident ON ai_analyses(incident_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON ai_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_model ON ai_analyses(model_used);

COMMENT ON TABLE ai_analyses IS 'LLM analysis results for incidents - full audit trail';
COMMENT ON COLUMN ai_analyses.analysis_id IS 'Unique analysis ID (e.g., analysis-a4b3c2d1)';
COMMENT ON COLUMN ai_analyses.incident_id IS 'Related incident';
COMMENT ON COLUMN ai_analyses.input_packet IS 'Full context sent to LLM (session, decisions, transcripts, PR, deployment)';
COMMENT ON COLUMN ai_analyses.likely_cause IS 'LLM-identified root cause';
COMMENT ON COLUMN ai_analyses.risky_assumptions IS 'Assumptions that led to incident';
COMMENT ON COLUMN ai_analyses.suggested_fix IS 'Detailed fix recommendation';
COMMENT ON COLUMN ai_analyses.recommended_reviewer IS 'Best engineer to review fix';
COMMENT ON COLUMN ai_analyses.model_used IS 'Which LLM model was used';
COMMENT ON COLUMN ai_analyses.tokens_used IS 'Token cost for this analysis';
COMMENT ON COLUMN ai_analyses.latency_ms IS 'Analysis duration in milliseconds';

-- ===============================
-- GENERATED PRS TABLE
-- ===============================
-- Tracks AI-generated fix pull requests

CREATE TABLE IF NOT EXISTS generated_prs (
    generated_pr_id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    analysis_id TEXT REFERENCES ai_analyses(analysis_id),

    -- GitHub PR details
    github_pr_number INTEGER,
    github_pr_url TEXT,
    branch_name TEXT NOT NULL,

    -- Fix metadata
    fix_description TEXT NOT NULL,
    files_to_change TEXT[] NOT NULL,

    -- Status tracking
    status TEXT NOT NULL CHECK (status IN ('pending', 'created', 'failed')) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_message TEXT,

    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_generated_prs_incident ON generated_prs(incident_id);
CREATE INDEX IF NOT EXISTS idx_generated_prs_analysis ON generated_prs(analysis_id);
CREATE INDEX IF NOT EXISTS idx_generated_prs_status ON generated_prs(status);
CREATE INDEX IF NOT EXISTS idx_generated_prs_created_at ON generated_prs(created_at DESC);

COMMENT ON TABLE generated_prs IS 'AI-generated fix pull requests - links analysis to GitHub PR';
COMMENT ON COLUMN generated_prs.generated_pr_id IS 'Unique ID (e.g., gen-pr-a4b3c2d1)';
COMMENT ON COLUMN generated_prs.incident_id IS 'Incident being fixed';
COMMENT ON COLUMN generated_prs.analysis_id IS 'Analysis that generated this fix';
COMMENT ON COLUMN generated_prs.github_pr_number IS 'GitHub PR number (e.g., 42)';
COMMENT ON COLUMN generated_prs.github_pr_url IS 'Full GitHub PR URL';
COMMENT ON COLUMN generated_prs.branch_name IS 'Git branch name (e.g., fix/incident-123)';
COMMENT ON COLUMN generated_prs.fix_description IS 'Human-readable fix description';
COMMENT ON COLUMN generated_prs.files_to_change IS 'Files modified in PR';
COMMENT ON COLUMN generated_prs.status IS 'PR creation status: pending, created, or failed';
COMMENT ON COLUMN generated_prs.error_message IS 'Error details if PR creation failed';

-- ===============================
-- HELPER VIEWS
-- ===============================

-- View: Incidents with analysis and generated PRs
CREATE OR REPLACE VIEW incidents_with_ai_context AS
SELECT
    i.*,
    -- AI Analysis
    a.analysis_id,
    a.likely_cause,
    a.risky_assumptions,
    a.suggested_fix,
    a.recommended_reviewer,
    a.model_used,
    a.created_at as analysis_created_at,
    -- Generated PR
    g.generated_pr_id,
    g.github_pr_number as fix_pr_number,
    g.github_pr_url as fix_pr_url,
    g.branch_name as fix_branch,
    g.status as fix_pr_status,
    g.created_at as fix_pr_created_at
FROM incidents i
LEFT JOIN ai_analyses a ON a.incident_id = i.incident_id
LEFT JOIN generated_prs g ON g.incident_id = i.incident_id
ORDER BY i.created_at DESC;

COMMENT ON VIEW incidents_with_ai_context IS 'Incidents with AI analysis and generated fix PRs';

-- View: Analysis performance metrics
CREATE OR REPLACE VIEW analysis_metrics AS
SELECT
    model_used,
    COUNT(*) as total_analyses,
    AVG(tokens_used) as avg_tokens,
    AVG(latency_ms) as avg_latency_ms,
    MIN(latency_ms) as min_latency_ms,
    MAX(latency_ms) as max_latency_ms,
    DATE_TRUNC('day', created_at) as analysis_date
FROM ai_analyses
WHERE tokens_used IS NOT NULL AND latency_ms IS NOT NULL
GROUP BY model_used, DATE_TRUNC('day', created_at)
ORDER BY analysis_date DESC;

COMMENT ON VIEW analysis_metrics IS 'LLM performance metrics by model and date';

-- ===============================
-- FUNCTIONS
-- ===============================

-- Function: Get full incident resolution timeline
CREATE OR REPLACE FUNCTION get_incident_resolution_timeline(p_incident_id TEXT)
RETURNS TABLE (
    event_type TEXT,
    event_timestamp TIMESTAMPTZ,
    event_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    -- Original incident timeline events
    SELECT * FROM get_incident_timeline(p_incident_id)

    UNION ALL

    -- AI Analysis event
    SELECT 'ai_analysis' as event_type,
           a.created_at as event_timestamp,
           jsonb_build_object(
               'analysis_id', a.analysis_id,
               'model_used', a.model_used,
               'likely_cause', a.likely_cause,
               'recommended_reviewer', a.recommended_reviewer
           ) as event_data
    FROM ai_analyses a
    WHERE a.incident_id = p_incident_id

    UNION ALL

    -- Fix PR creation event
    SELECT 'fix_pr_created' as event_type,
           g.created_at as event_timestamp,
           jsonb_build_object(
               'generated_pr_id', g.generated_pr_id,
               'github_pr_number', g.github_pr_number,
               'github_pr_url', g.github_pr_url,
               'status', g.status
           ) as event_data
    FROM generated_prs g
    WHERE g.incident_id = p_incident_id

    ORDER BY event_timestamp;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_incident_resolution_timeline IS 'Complete timeline including AI analysis and fix PR creation';

-- Function: Get analysis effectiveness
CREATE OR REPLACE FUNCTION get_analysis_effectiveness()
RETURNS TABLE (
    total_incidents INTEGER,
    incidents_analyzed INTEGER,
    fix_prs_created INTEGER,
    fix_prs_succeeded INTEGER,
    avg_time_to_analysis_minutes FLOAT,
    avg_time_to_fix_pr_minutes FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT i.incident_id)::INTEGER as total_incidents,
        COUNT(DISTINCT a.incident_id)::INTEGER as incidents_analyzed,
        COUNT(DISTINCT g.incident_id)::INTEGER as fix_prs_created,
        COUNT(DISTINCT CASE WHEN g.status = 'created' THEN g.incident_id END)::INTEGER as fix_prs_succeeded,
        AVG(EXTRACT(EPOCH FROM (a.created_at - i.created_at))/60)::FLOAT as avg_time_to_analysis_minutes,
        AVG(EXTRACT(EPOCH FROM (g.created_at - i.created_at))/60)::FLOAT as avg_time_to_fix_pr_minutes
    FROM incidents i
    LEFT JOIN ai_analyses a ON a.incident_id = i.incident_id
    LEFT JOIN generated_prs g ON g.incident_id = i.incident_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_analysis_effectiveness IS 'Metrics on AI analysis and fix PR effectiveness';

-- ===============================
-- DISABLE RLS FOR DEMO
-- ===============================
ALTER TABLE ai_analyses DISABLE ROW LEVEL SECURITY;
ALTER TABLE generated_prs DISABLE ROW LEVEL SECURITY;

-- ===============================
-- VERIFICATION QUERIES
-- ===============================

-- Verify new tables were created
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('ai_analyses', 'generated_prs')
ORDER BY table_name;

-- Verify foreign keys
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
AND tc.table_name IN ('ai_analyses', 'generated_prs');

-- Test views
SELECT * FROM incidents_with_ai_context LIMIT 1;
SELECT * FROM analysis_metrics LIMIT 5;

-- Test functions
SELECT * FROM get_analysis_effectiveness();
