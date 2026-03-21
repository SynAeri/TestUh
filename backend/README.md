# Nexus OS Backend

FastAPI backend providing the Universal Data Layer for Nexus OS. Standardizes unstructured enterprise data (Slack, PDFs, videos, docs) into a queryable JSON structure.

## Architecture

- **Framework**: FastAPI
- **Database**: Supabase (PostgreSQL with vector support)
- **AI**: Anthropic Claude 3.5 Sonnet
- **Pattern**: RAG (Retrieval-Augmented Generation)

## Prerequisites

1. Python 3.10+
2. Supabase account and project
3. Anthropic API key

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Supabase

Create a new Supabase project at https://supabase.com

**See `SQL_D.md` for complete database setup instructions.**

Quick setup - run this SQL in the Supabase SQL editor:

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

### 3. Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your credentials:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_anon_or_service_role_key
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### 4. Run the Server

**Option A: Local Development**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API will be available at http://localhost:8000

**Option B: Expose to Frontend via Ngrok (Recommended for Hackathon)**

If your frontend dev is working separately, use ngrok to expose your local backend:

1. Start the backend server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

2. In a separate terminal, start ngrok:
   ```bash
   ngrok http 8000
   ```

3. Ngrok will display a public URL:
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:8000
   ```

4. Give the ngrok URL to your frontend developer:
   - Base URL: `https://abc123.ngrok.io`
   - Frontend will use this for all API calls
   - CORS is already configured to allow all origins

**Note:** Ngrok free tier URLs change on restart. Use `ngrok http 8000 --domain=your-static-domain` with a paid account for persistent URLs.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info and available endpoints |
| `/health` | GET | Health check |
| `/ingest/mock` | POST | Ingest 15 curated demo files into Supabase |
| `/query` | POST | RAG-based semantic search with AI answers |
| `/insights` | GET | ROI dashboard data (tool overlap, cost savings) |
| `/source/{id}` | GET | Raw source details for lineage view |

## Usage Flow

### 1. Ingest Mock Data

```bash
curl -X POST http://localhost:8000/ingest/mock
```

This loads 15 synthetic enterprise documents demonstrating:
- Budget discussions about tool overlap
- Invoices showing SaaS costs
- Meeting transcripts
- Security incidents
- Employee feedback

### 2. Query the Data

```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Are we overspending on documentation tools?", "limit": 5}'
```

Returns AI-generated answer with source citations.

### 3. Get Insights

```bash
curl http://localhost:8000/insights
```

Returns hardcoded ROI metrics for demo:
- Tool redundancy detection
- Cost savings opportunities
- Security risks
- Employee productivity impacts

### 4. View Source Details

```bash
curl http://localhost:8000/source/{uuid}
```

Returns raw content and metadata for trust/lineage view.

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application
│   ├── config/
│   │   └── supabase.py         # Supabase client
│   ├── models/
│   │   └── schemas.py          # Pydantic models
│   ├── routes/
│   │   ├── ingest.py           # Ingestion endpoints
│   │   ├── query.py            # Query endpoints
│   │   ├── insights.py         # Insights endpoints
│   │   └── source.py           # Source detail endpoints
│   └── services/
│       ├── ingest_service.py   # Mock data ingestion
│       ├── query_service.py    # RAG search logic
│       ├── insights_service.py # ROI calculations
│       └── source_service.py   # Source retrieval
├── requirements.txt
├── .env.example
├── init_supabase.sql           # SQL table creation script
├── SQL_D.md                    # Complete database setup guide
├── USER_JOURNEY.md             # Frontend process mapping
└── README.md
```

## Demo Notes

This is a **Golden Path Demo** optimized for hackathon presentation:

- **No real OAuth/API integrations** - Mock data is pre-curated
- **Simple vector search** - Using basic cosine similarity (not pgvector yet)
- **Hardcoded insights** - ROI metrics are static for demo consistency
- **15 synthetic documents** - Crafted to tell a cohesive story about tool overlap

## Production Roadmap

For a real production deployment, you would add:

- Real OAuth integrations (Slack, Google Drive, etc.)
- Proper vector database (pgvector, Pinecone, Weaviate)
- Dagster for orchestration
- S3 data lake for raw storage
- Snowflake/BigQuery for analytics
- Authentication and authorization
- Rate limiting and caching
- Monitoring and logging

## Troubleshooting

**Supabase connection fails:**
- Verify SUPABASE_URL and SUPABASE_KEY in .env
- Check that the nexus_objects table exists
- Ensure network access to Supabase project

**Anthropic API errors:**
- Verify ANTHROPIC_API_KEY is valid
- Check API quota limits
- Ensure you have Claude 3.5 Sonnet access

**Import errors:**
- Ensure you're in the backend directory
- Run `pip install -r requirements.txt`
- Check Python version is 3.10+
