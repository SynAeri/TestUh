-- Add PR milestone tracking to ai_decisions and ai_sessions
-- This allows tracking which decisions happened before/after PR creation

-- Add pr_milestone column to track PR timeline
ALTER TABLE ai_decisions
ADD COLUMN IF NOT EXISTS pr_milestone JSONB DEFAULT NULL;

-- Add pr_milestones array to sessions to track all PRs
ALTER TABLE ai_sessions
ADD COLUMN IF NOT EXISTS pr_milestones JSONB DEFAULT '[]'::jsonb;

-- Create index for PR milestone queries
CREATE INDEX IF NOT EXISTS idx_ai_decisions_pr_milestone
ON ai_decisions USING GIN (pr_milestone);

-- Comments
COMMENT ON COLUMN ai_decisions.pr_milestone IS 'PR context: null (before any PR), {pr_id: "42", created_before_pr: true} or {pr_id: "43", created_before_pr: false}';
COMMENT ON COLUMN ai_sessions.pr_milestones IS 'Array of PR milestones: [{pr_id: "42", created_at: "2024-03-22T12:00:00Z", decision_count_at_pr: 5}]';
