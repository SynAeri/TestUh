# Supabase Database Setup for Nexus OS

Complete SQL commands to initialize your Supabase database. Run these in order in the Supabase SQL Editor.

---

## Step 1: Access Supabase SQL Editor

1. Go to https://supabase.com
2. Create a new project (or select existing)
3. Navigate to **SQL Editor** in the left sidebar
4. Create a new query

---

## Step 2: Create the Main Table

Run this SQL to create the `nexus_objects` table with the Universal Schema:

```sql
-- Create the nexus_objects table
-- This is the Universal Data Layer that stores all ingested enterprise data

CREATE TABLE IF NOT EXISTS nexus_objects (
    id UUID PRIMARY KEY,
    source_type TEXT NOT NULL CHECK (source_type IN ('slack', 'pdf', 'video', 'doc')),
    timestamp TIMESTAMPTZ NOT NULL,
    raw_content TEXT NOT NULL,
    vector_embedding FLOAT8[],
    metadata JSONB
);

-- Add table comment
COMMENT ON TABLE nexus_objects IS 'Universal Data Layer - All ingested enterprise data in standardized format';

-- Add column comments
COMMENT ON COLUMN nexus_objects.id IS 'Unique identifier for each data object';
COMMENT ON COLUMN nexus_objects.source_type IS 'Origin platform: slack, pdf, video, or doc';
COMMENT ON COLUMN nexus_objects.timestamp IS 'When the content was created or captured';
COMMENT ON COLUMN nexus_objects.raw_content IS 'Original text content';
COMMENT ON COLUMN nexus_objects.vector_embedding IS 'Embedding vector for semantic search (1536 dimensions)';
COMMENT ON COLUMN nexus_objects.metadata IS 'Source-specific metadata (author, channel, page_no, url, etc.)';
```

---

## Step 3: Create Indexes for Performance

Run this SQL to create indexes for fast queries:

```sql
-- Index on source_type for filtering by source
CREATE INDEX IF NOT EXISTS idx_nexus_source_type
ON nexus_objects(source_type);

-- Index on timestamp for time-based queries
CREATE INDEX IF NOT EXISTS idx_nexus_timestamp
ON nexus_objects(timestamp);

-- GIN index on metadata JSONB for fast metadata queries
CREATE INDEX IF NOT EXISTS idx_nexus_metadata
ON nexus_objects USING GIN (metadata);
```

---

## Step 4: Enable Row Level Security (RLS)

For production, you should enable RLS. For the hackathon demo, you can skip this or use simple policies:

```sql
-- Enable RLS on the table
ALTER TABLE nexus_objects ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for authenticated users
-- (For demo purposes - in production, you'd have more granular policies)
CREATE POLICY "Allow all operations for authenticated users"
ON nexus_objects
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create a policy for anonymous users (if you want to allow public read access)
CREATE POLICY "Allow read access for anonymous users"
ON nexus_objects
FOR SELECT
TO anon
USING (true);
```

**Note:** For the hackathon demo, you can also just disable RLS entirely:
```sql
ALTER TABLE nexus_objects DISABLE ROW LEVEL SECURITY;
```

---

## Step 5: Verify Table Creation

Run this query to verify the table was created correctly:

```sql
-- Check table structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'nexus_objects'
ORDER BY ordinal_position;
```

You should see:
```
column_name       | data_type                   | is_nullable
------------------|-----------------------------|------------
id                | uuid                        | NO
source_type       | text                        | NO
timestamp         | timestamp with time zone    | NO
raw_content       | text                        | NO
vector_embedding  | ARRAY                       | YES
metadata          | jsonb                       | YES
```

---

## Step 6: Get Your Supabase Credentials

### Get Supabase URL
1. In Supabase dashboard, go to **Settings** → **API**
2. Copy the **Project URL** (e.g., `https://abcdefgh.supabase.co`)

### Get Supabase API Key
1. In the same **API** settings page
2. Copy the **anon public** key (for public access)
3. OR copy the **service_role** key (for full access - use this for the backend)

### Add to .env
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

---

## Step 7: Test the Connection

After running the SQL and configuring your `.env`, test the connection:

```bash
# Start your backend
uvicorn app.main:app --reload --port 8000

# In another terminal, test the ingestion
curl -X POST http://localhost:8000/ingest/mock
```

You should see:
```json
{
  "status": "success",
  "files_processed": 15,
  "objects_created": 15,
  "message": "Successfully ingested 15 objects into the Universal Data Layer"
}
```

---

## Step 8: Verify Data in Supabase

Go back to Supabase:
1. Click **Table Editor** in the left sidebar
2. Select the `nexus_objects` table
3. You should see 15 rows with data

Or run this SQL:
```sql
-- Check how many records were inserted
SELECT COUNT(*) FROM nexus_objects;

-- View all records
SELECT
    id,
    source_type,
    timestamp,
    LEFT(raw_content, 50) as content_preview,
    metadata->>'author' as author
FROM nexus_objects
ORDER BY timestamp DESC;
```

---

## Optional: Advanced Vector Search Setup

If you want to use Supabase's native vector search (pgvector) instead of the basic cosine similarity:

```sql
-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Alter the table to use the vector type instead of FLOAT8[]
-- (Only do this if starting fresh, not after ingesting data)
ALTER TABLE nexus_objects
ALTER COLUMN vector_embedding TYPE vector(1536);

-- Create a vector similarity search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  source_type text,
  raw_content text,
  metadata jsonb,
  similarity float
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    nexus_objects.id,
    nexus_objects.source_type,
    nexus_objects.raw_content,
    nexus_objects.metadata,
    1 - (nexus_objects.vector_embedding <=> query_embedding) as similarity
  FROM nexus_objects
  WHERE 1 - (nexus_objects.vector_embedding <=> query_embedding) > match_threshold
  ORDER BY nexus_objects.vector_embedding <=> query_embedding
  LIMIT match_count;
$$;
```

**Note:** For the hackathon demo, the basic FLOAT8[] approach is fine. This advanced setup is for production scalability.

---

## Troubleshooting

### Error: "relation 'nexus_objects' does not exist"
- Make sure you ran Step 2 successfully
- Check you're using the correct Supabase project
- Verify in Table Editor that the table exists

### Error: "new row violates check constraint"
- The `source_type` must be one of: 'slack', 'pdf', 'video', 'doc'
- Check your backend code is using these exact values

### Error: "permission denied for table nexus_objects"
- Your API key doesn't have access
- Use the **service_role** key instead of **anon** key
- Or disable RLS (Step 4)

### Connection Timeout
- Check your `SUPABASE_URL` is correct
- Verify your network can reach Supabase
- Try opening the URL in a browser

---

## Complete Setup Checklist

- [ ] Supabase project created
- [ ] Ran Step 2 SQL (create table)
- [ ] Ran Step 3 SQL (create indexes)
- [ ] Ran Step 4 SQL (RLS setup or disable)
- [ ] Copied Supabase URL to .env
- [ ] Copied Supabase service_role key to .env
- [ ] Added Anthropic API key to .env
- [ ] Tested `POST /ingest/mock` successfully
- [ ] Verified 15 rows in Supabase Table Editor

Once all checkboxes are complete, your backend is ready for the frontend!

---

## Quick Reference: All SQL in One Block

If you want to copy-paste everything at once:

```sql
-- Complete Nexus OS Database Setup

-- Create table
CREATE TABLE IF NOT EXISTS nexus_objects (
    id UUID PRIMARY KEY,
    source_type TEXT NOT NULL CHECK (source_type IN ('slack', 'pdf', 'video', 'doc')),
    timestamp TIMESTAMPTZ NOT NULL,
    raw_content TEXT NOT NULL,
    vector_embedding FLOAT8[],
    metadata JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_nexus_source_type ON nexus_objects(source_type);
CREATE INDEX IF NOT EXISTS idx_nexus_timestamp ON nexus_objects(timestamp);
CREATE INDEX IF NOT EXISTS idx_nexus_metadata ON nexus_objects USING GIN (metadata);

-- Disable RLS for demo (enable for production)
ALTER TABLE nexus_objects DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'nexus_objects'
ORDER BY ordinal_position;
```

Copy the entire block, paste into Supabase SQL Editor, and click "Run".
