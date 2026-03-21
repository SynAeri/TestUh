# Backend Developer Quick Start

5-minute setup guide to get your backend running and connected to the frontend.

---

## Prerequisites

- [ ] Python 3.10+ installed
- [ ] Supabase account created
- [ ] Anthropic API key obtained

---

## Step 1: Database Setup (2 minutes)

1. Go to https://supabase.com and create a new project
2. Wait for project to provision
3. Navigate to **SQL Editor** (left sidebar)
4. Copy this entire SQL block and paste it:

```sql
CREATE TABLE nexus_objects (
    id UUID PRIMARY KEY,
    source_type TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    raw_content TEXT NOT NULL,
    vector_embedding FLOAT8[],
    metadata JSONB
);

CREATE INDEX idx_nexus_source_type ON nexus_objects(source_type);
CREATE INDEX idx_nexus_timestamp ON nexus_objects(timestamp);
ALTER TABLE nexus_objects DISABLE ROW LEVEL SECURITY;
```

5. Click "Run"
6. Go to **Settings** → **API** and copy:
   - Project URL (e.g., `https://xxx.supabase.co`)
   - service_role key (the secret one, not anon)

---

## Step 2: Backend Setup (1 minute)

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` with your credentials:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-your-key
```

---

## Step 3: Start Backend (30 seconds)

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Test it works:
```bash
curl http://localhost:8000/health
```

Should return: `{"status": "healthy"}`

---

## Step 4: Expose via Ngrok (1 minute)

In a NEW terminal (keep the server running):

```bash
ngrok http 8000
```

Copy the ngrok URL that appears:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:8000
```

---

## Step 5: Load Demo Data (30 seconds)

```bash
curl -X POST https://abc123.ngrok.io/ingest/mock
```

Should return:
```json
{
  "status": "success",
  "files_processed": 15,
  "objects_created": 15,
  "message": "Successfully ingested 15 objects into the Universal Data Layer"
}
```

---

## Step 6: Give Frontend Dev the URL

Send your frontend developer:
- **API Base URL:** `https://abc123.ngrok.io`
- **USER_JOURNEY.md** (explains which endpoints to call when)

They'll configure their frontend like this:
```javascript
const API_BASE_URL = "https://abc123.ngrok.io"

// Ingestion
await fetch(`${API_BASE_URL}/ingest/mock`, { method: 'POST' })

// Search
await fetch(`${API_BASE_URL}/query`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: "Are we overspending?", limit: 5 })
})

// Insights
await fetch(`${API_BASE_URL}/insights`)

// Source detail
await fetch(`${API_BASE_URL}/source/${sourceId}`)
```

---

## Test All Endpoints

### Health Check
```bash
curl https://abc123.ngrok.io/health
```

### Ingest
```bash
curl -X POST https://abc123.ngrok.io/ingest/mock
```

### Query
```bash
curl -X POST https://abc123.ngrok.io/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Are we overspending on documentation tools?", "limit": 5}'
```

### Insights
```bash
curl https://abc123.ngrok.io/insights
```

### Source Detail (replace UUID with one from query results)
```bash
curl https://abc123.ngrok.io/source/{uuid-from-previous-response}
```

---

## What the Backend Does

Your backend is now:
1. Serving a FastAPI app with 4 core endpoints
2. Connected to Supabase (stores 15 demo documents)
3. Using Claude 3.5 Sonnet for RAG search
4. Exposing a public URL via ngrok for frontend integration

---

## Troubleshooting

**"relation 'nexus_objects' does not exist"**
- Go back to Step 1 and run the SQL again in Supabase

**"SUPABASE_URL and SUPABASE_KEY must be set"**
- Check your `.env` file has the correct values
- Make sure you're using the service_role key, not anon

**Ngrok URL not working**
- Make sure the server is still running in the other terminal
- Try restarting ngrok
- Check CORS is enabled (it is by default in app/main.py)

**Import errors**
- Make sure you're in the `backend` directory
- Run `pip install -r requirements.txt` again
- Check Python version: `python --version` (should be 3.10+)

---

## You're Done!

Your backend is now ready. The frontend team can start building the 4 processes:
1. Ingestion Hub → calls `/ingest/mock`
2. Omni-Search → calls `/query`
3. ROI Dashboard → calls `/insights`
4. Lineage Inspector → calls `/source/{id}`

See **USER_JOURNEY.md** for the complete frontend integration guide.
