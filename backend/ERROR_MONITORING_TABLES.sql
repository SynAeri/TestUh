-- Error monitoring tables for automatic incident detection
-- Run this in Supabase SQL Editor to enable automatic incident creation

-- Error events table - stores all error occurrences
CREATE TABLE IF NOT EXISTS error_events (
    error_id TEXT PRIMARY KEY,
    service_name TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_type TEXT NOT NULL,
    stack_trace TEXT,
    user_id TEXT,
    request_path TEXT,
    environment TEXT NOT NULL DEFAULT 'production',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast querying by service and time
CREATE INDEX IF NOT EXISTS idx_error_events_service_time
ON error_events(service_name, environment, timestamp DESC);

-- Index for fast error counting
CREATE INDEX IF NOT EXISTS idx_error_events_timestamp
ON error_events(timestamp DESC);

-- View: Recent error summary by service
CREATE OR REPLACE VIEW error_summary AS
SELECT
    service_name,
    environment,
    COUNT(*) as error_count,
    COUNT(DISTINCT error_type) as unique_error_types,
    MAX(timestamp) as last_error_at,
    ARRAY_AGG(DISTINCT error_type) as error_types
FROM error_events
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY service_name, environment
ORDER BY error_count DESC;

-- View: Services with potential incidents (3+ errors in 5 min)
CREATE OR REPLACE VIEW services_at_risk AS
SELECT
    service_name,
    environment,
    COUNT(*) as recent_error_count,
    MAX(timestamp) as last_error_at,
    ARRAY_AGG(error_message ORDER BY timestamp DESC) FILTER (WHERE timestamp > NOW() - INTERVAL '5 minutes') as recent_errors
FROM error_events
WHERE timestamp > NOW() - INTERVAL '5 minutes'
GROUP BY service_name, environment
HAVING COUNT(*) >= 3
ORDER BY recent_error_count DESC;

-- Function: Clean up old error events (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_errors()
RETURNS void AS $$
BEGIN
    DELETE FROM error_events
    WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE error_events IS 'Stores error events from application monitoring for automatic incident detection';
COMMENT ON VIEW error_summary IS 'Real-time error summary by service for the last hour';
COMMENT ON VIEW services_at_risk IS 'Services that have exceeded error threshold (3+ errors in 5 min) and may need incidents';
COMMENT ON FUNCTION cleanup_old_errors IS 'Removes error events older than 7 days to manage storage';
