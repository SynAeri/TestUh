-- Supabase table initialization for Nexus OS
-- Run this in your Supabase SQL Editor to create the nexus_objects table

CREATE TABLE IF NOT EXISTS nexus_objects (
    id UUID PRIMARY KEY,
    source_type TEXT NOT NULL CHECK (source_type IN ('slack', 'pdf', 'video', 'doc')),
    timestamp TIMESTAMPTZ NOT NULL,
    raw_content TEXT NOT NULL,
    vector_embedding FLOAT8[],
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_nexus_source_type ON nexus_objects(source_type);
CREATE INDEX IF NOT EXISTS idx_nexus_timestamp ON nexus_objects(timestamp);
CREATE INDEX IF NOT EXISTS idx_nexus_metadata ON nexus_objects USING GIN (metadata);

COMMENT ON TABLE nexus_objects IS 'Universal Data Layer - All ingested enterprise data in standardized format';
COMMENT ON COLUMN nexus_objects.id IS 'Unique identifier for each data object';
COMMENT ON COLUMN nexus_objects.source_type IS 'Origin platform: slack, pdf, video, or doc';
COMMENT ON COLUMN nexus_objects.timestamp IS 'When the content was created or captured';
COMMENT ON COLUMN nexus_objects.raw_content IS 'Original text content';
COMMENT ON COLUMN nexus_objects.vector_embedding IS 'Embedding vector for semantic search (1536 dimensions)';
COMMENT ON COLUMN nexus_objects.metadata IS 'Source-specific metadata (author, channel, page_no, url, etc.)';
