# Nexus OS User Journey & Endpoint Mapping

This document maps the 4 core frontend processes to their backend endpoints, explaining the exact user journey and what each API call demonstrates.

---

## Journey Overview

The demo follows a linear narrative that proves three things:
1. **Universal Data Layer** - We can standardize any enterprise data source
2. **Proactive Intelligence** - AI can find insights humans miss
3. **Enterprise Trust** - Full lineage and transparency (no hallucinations)

---

## Process 1: The Ingestion Hub

**Frontend UI:** Grid of enterprise logos (Slack, Google Drive, Confluence, Zoom, etc.) with "Connect" toggles

### User Journey
1. User lands on the ingestion page
2. Sees enterprise logos in a grid layout
3. Clicks "Connect" on Slack logo
4. Animated sequence plays: "Scanning..." → "Mapping..." → "Indexing..."
5. Slack logo turns green with checkmark
6. User clicks "Connect" on PDF/Google Drive
7. Same animation sequence
8. Status shows: "15 files standardized"

### Backend Endpoint Called

**`POST /ingest/mock`**

**When:** Triggered when user clicks ANY "Connect" button (even though it says "Slack" or "PDF", they all trigger the same mock ingestion)

**What it does:**
- Inserts all 15 curated files into `nexus_objects` table
- Each file gets standardized into the Universal Schema
- Returns success message with count

**What it demonstrates:**
- **Innovation:** The "Universal Data Layer" concept - every source type (Slack, PDF, video, doc) maps to the same schema
- **Defensibility:** The proprietary mapping logic that transforms unstructured noise into queryable JSON

**Frontend Response Handling:**
```javascript
// Pseudo-code
onClick("Connect Slack") {
  showAnimation("Scanning Slack channels...")
  await POST /ingest/mock
  showAnimation("Mapping to Universal Schema...")
  showSuccess("15 files indexed")
  updateUI(connectedServices: ["slack", "pdf", "video", "doc"])
}
```

**Success Metrics Shown:**
- "15 files processed"
- "4 source types connected"
- "Universal Schema: 100% coverage"

---

## Process 2: Omni-Search (The Brain)

**Frontend UI:** Minimalist `Cmd + K` search bar (like Notion/Linear)

### User Journey
1. User presses `Cmd + K` (or clicks search icon)
2. Search modal appears with placeholder: "Ask anything about your company data..."
3. User types: **"Are we overspending on documentation tools?"**
4. Hits Enter
5. Loading animation shows: "Searching 15 sources..."
6. AI response streams in word-by-word (like ChatGPT)
7. Right sidebar appears with **Source Citations** (3-5 cards)
8. Each citation shows:
   - Source type icon (Slack/PDF/Video badge)
   - Snippet of text
   - Relevance score
   - Click to expand full source

### Backend Endpoint Called

**`POST /query`**

**Request Body:**
```json
{
  "query": "Are we overspending on documentation tools?",
  "limit": 5
}
```

**When:** User submits search query

**What it does:**
1. Generates embedding for the query
2. Performs vector similarity search in Supabase
3. Retrieves top 5 most relevant sources
4. Sends context + query to Claude 3.5 Sonnet
5. Returns AI answer + source citations with scores

**What it demonstrates:**
- **Fluency:** RAG-based semantic search (not keyword matching)
- **Innovation:** Unified search across all source types (Slack message + PDF invoice + video transcript)
- **Trust:** Every claim is cited with source

**Example Response:**
```json
{
  "answer": "Yes, there appears to be significant overspending on documentation tools. According to the invoice data, your company pays $45,000/year for Notion and $60,000/year for Confluence. Multiple Slack messages and meeting transcripts indicate these tools have overlapping functionality, with employees reporting confusion about which platform to use. A cost optimization report suggests consolidating to a single platform could save $45,000 annually.",
  "sources": [
    {
      "id": "uuid-1",
      "source_type": "pdf",
      "snippet": "Invoice #INV-2024-0234: Notion Enterprise - Annual License Fee: $45,000",
      "metadata": {"author": "Notion", "page_no": 1},
      "relevance_score": 0.94
    },
    {
      "id": "uuid-2",
      "source_type": "slack",
      "snippet": "@sarah mentioned we're overspending on Notion licenses by $15k/year...",
      "metadata": {"author": "John Smith", "channel": "#finance"},
      "relevance_score": 0.89
    }
  ],
  "query": "Are we overspending on documentation tools?"
}
```

**Frontend Display:**
- Main panel: Stream the `answer` text
- Right sidebar: Map `sources` array to citation cards
- Each card clickable → triggers Process 4 (Lineage Inspector)

---

## Process 3: ROI Dashboard (Optimization)

**Frontend UI:** Dashboard with bar charts, metric cards, and "Critical Alerts"

### User Journey
1. User navigates to "Insights" or "ROI Dashboard" tab
2. Page loads with animated metric cards
3. Top section shows:
   - "Tool Redundancy Detected" (critical alert badge)
   - "Annual Savings Opportunity: $45,000" (large number)
4. Charts animate in:
   - Bar chart: Notion vs Confluence license costs
   - Pie chart: Employee confusion metrics (67% report issues)
5. Bottom section: "Critical Alerts"
   - "3x Attack Surface" (security warning)
   - "Onboarding Friction: 3.5 days lost per new hire"

### Backend Endpoint Called

**`GET /insights`**

**When:** User navigates to Insights/ROI page (page load)

**What it does:**
- Returns hardcoded JSON with 6 key metrics
- Each metric has: name, value, description, severity

**What it demonstrates:**
- **Efficiency:** The "StackSync" concept - proactive detection of tool overlap
- **ROI:** Platform pays for itself ($45k savings > platform cost)
- **Defensibility:** This is the "secret sauce" - automated SaaS audit

**Response:**
```json
{
  "insights": [
    {
      "metric": "Tool Redundancy Detected",
      "value": "3 overlapping platforms",
      "description": "Notion, Confluence, and Google Docs serve similar documentation purposes",
      "severity": "critical"
    },
    {
      "metric": "Annual Cost Savings Opportunity",
      "value": "$45,000",
      "description": "Consolidating to a single documentation platform could eliminate redundant licenses",
      "severity": "warning"
    },
    {
      "metric": "Employee Productivity Loss",
      "value": "67% report confusion",
      "description": "Majority of employees struggle to locate documentation across multiple platforms",
      "severity": "warning"
    },
    {
      "metric": "Security Risk",
      "value": "3x attack surface",
      "description": "Multiple platforms increase security audit complexity and compliance risk",
      "severity": "critical"
    },
    {
      "metric": "License Utilization",
      "value": "Notion: 450/500 seats, Confluence: 480/500 seats",
      "description": "Both platforms operating near capacity with significant overlap in users",
      "severity": "info"
    },
    {
      "metric": "Onboarding Friction",
      "value": "3.5 days average",
      "description": "New hires spend additional time learning multiple overlapping systems",
      "severity": "warning"
    }
  ],
  "generated_at": "2024-01-15T10:30:00Z"
}
```

**Frontend Display:**
- Critical severity → Red badge + top of list
- Warning severity → Yellow badge
- Info severity → Blue badge
- Animate numbers counting up
- Render bar chart from license utilization data

---

## Process 4: The Lineage Inspector

**Frontend UI:** Split-screen "X-Ray" view (AI summary on left, raw JSON on right)

### User Journey
1. User clicks on a source citation from Process 2 (search results)
2. OR user clicks "View Source" from dashboard metric
3. Split-screen modal opens:
   - **Left panel:** AI-generated summary of the source
   - **Right panel:** Raw JSON with all metadata
4. User can see:
   - Original source type (Slack/PDF badge)
   - Timestamp
   - Author
   - Full raw content (unprocessed)
   - All metadata (channel, page number, URL)

### Backend Endpoint Called

**`GET /source/{id}`**

**When:** User clicks a source citation or "View Source" link

**What it does:**
- Retrieves the full NexusObject from Supabase by UUID
- Returns raw content + all metadata

**What it demonstrates:**
- **Trust:** Full transparency (no hallucinations, show original source)
- **Compliance:** Audit trail (who said what, when, where)
- **Enterprise Grade:** Lineage tracking (data governance)

**Example Request:**
```
GET /source/uuid-abc-123
```

**Response:**
```json
{
  "id": "uuid-abc-123",
  "source_type": "slack",
  "timestamp": "2024-01-10T14:23:00Z",
  "raw_content": "Budget discussion: @sarah mentioned we're overspending on Notion licenses by $15k/year. Should we consolidate?",
  "metadata": {
    "author": "John Smith",
    "channel": "#finance",
    "url": "slack://channel/finance/msg123"
  }
}
```

**Frontend Display:**
- Left panel: Format content nicely with author, timestamp, channel
- Right panel: Pretty-print JSON with syntax highlighting
- Show source type badge (Slack icon)
- Show "Open in Slack" link (using metadata.url)

---

## Complete User Flow (Demo Script)

**Act 1: Setup (30 seconds)**
1. Open ingestion page
2. Click "Connect Slack" → Calls `POST /ingest/mock`
3. Animation plays, shows "15 files indexed"

**Act 2: Discovery (45 seconds)**
4. Press `Cmd + K` to open search
5. Type: "Are we overspending on documentation tools?"
6. Calls `POST /query`
7. AI answer streams in with 5 source citations
8. Highlight one citation showing "$45,000 Notion invoice"

**Act 3: Impact (30 seconds)**
9. Navigate to Insights tab
10. Calls `GET /insights`
11. Dashboard shows:
    - "3 overlapping platforms detected"
    - "$45,000 savings opportunity"
    - "67% employee confusion"
12. Point at critical alerts

**Act 4: Trust (15 seconds)**
13. Click on citation from Act 2
14. Calls `GET /source/{id}`
15. Split screen shows AI summary vs raw Slack message
16. Show metadata: author, timestamp, channel

**Total Demo Time:** 2 minutes

---

## Ngrok Setup (Backend → Frontend)

Yes, using ngrok is perfect for connecting your local backend to the frontend.

### Backend Setup with Ngrok

1. **Start your FastAPI server:**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

2. **Start ngrok in a separate terminal:**
   ```bash
   ngrok http 8000
   ```

3. **Copy the ngrok URL:**
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:8000
   ```

4. **Give frontend dev the ngrok URL:**
   - Base URL: `https://abc123.ngrok.io`
   - They'll use this for all API calls

### Frontend API Configuration

Frontend should use:
```javascript
const API_BASE_URL = "https://abc123.ngrok.io"

// Example calls
await fetch(`${API_BASE_URL}/ingest/mock`, { method: 'POST' })
await fetch(`${API_BASE_URL}/query`, {
  method: 'POST',
  body: JSON.stringify({ query: "...", limit: 5 })
})
await fetch(`${API_BASE_URL}/insights`)
await fetch(`${API_BASE_URL}/source/${id}`)
```

### CORS Already Configured

The backend already has CORS middleware set to allow all origins:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows ngrok → frontend connections
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Endpoint Summary Table

| Process | UI Element | Endpoint | Method | Demonstrates |
|---------|-----------|----------|--------|--------------|
| Ingestion Hub | "Connect" button | `/ingest/mock` | POST | Universal Data Layer (Innovation) |
| Omni-Search | Search bar submit | `/query` | POST | RAG Intelligence (Fluency) |
| ROI Dashboard | Page load | `/insights` | GET | StackSync ROI (Efficiency) |
| Lineage Inspector | Citation click | `/source/{id}` | GET | Trust & Compliance |

---

## Key Talking Points (For Pitch)

**After showing Process 1 (Ingestion):**
> "Notice how Slack messages, PDFs, video transcripts, and docs all map to the same Universal Schema. This is our core IP - the standardization layer."

**After showing Process 2 (Search):**
> "This isn't keyword search. The AI understood 'overspending' semantically and connected a Slack conversation, an invoice, and a meeting transcript to answer a question no single source could answer alone."

**After showing Process 3 (Insights):**
> "This is where Nexus pays for itself. We automatically detected $45k in redundant tooling. The platform cost is $10k/year. That's 4.5x ROI on day one."

**After showing Process 4 (Lineage):**
> "Enterprises don't trust black boxes. Every AI answer is backed by raw sources with full metadata. This kills the hallucination concern."
