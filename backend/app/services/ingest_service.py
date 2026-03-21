# Ingestion service for processing mock data files into Supabase
# Handles the standardization of 15 curated files into the Universal Schema

import os
import uuid
from datetime import datetime
from typing import List, Dict, Any
from app.config.supabase import get_supabase_client

MOCK_FILES = [
    {
        "source_type": "slack",
        "content": "Budget discussion: @sarah mentioned we're overspending on Notion licenses by $15k/year. Should we consolidate?",
        "metadata": {"author": "John Smith", "channel": "#finance", "url": "slack://channel/finance/msg123"}
    },
    {
        "source_type": "pdf",
        "content": "Invoice #INV-2024-0234: Notion Enterprise - Annual License Fee: $45,000",
        "metadata": {"author": "Notion", "page_no": 1, "url": "s3://invoices/notion-2024.pdf"}
    },
    {
        "source_type": "video",
        "content": "Transcript: Sarah: 'We have significant overlap between Notion and Confluence. Teams are duplicating work across both platforms.'",
        "metadata": {"author": "Sarah Chen", "channel": "Q4 Review Meeting", "url": "zoom://recordings/meeting456"}
    },
    {
        "source_type": "doc",
        "content": "Project Status Report: The engineering team maintains documentation in both Notion and Confluence, causing version conflicts.",
        "metadata": {"author": "Mike Johnson", "page_no": 3, "url": "gdrive://docs/q4-status"}
    },
    {
        "source_type": "slack",
        "content": "@team The Confluence license renewal is coming up. Do we really need both tools?",
        "metadata": {"author": "Sarah Chen", "channel": "#engineering", "url": "slack://channel/engineering/msg789"}
    },
    {
        "source_type": "pdf",
        "content": "Confluence Server License Quote: 500 users @ $60,000/year",
        "metadata": {"author": "Atlassian", "page_no": 1, "url": "s3://quotes/confluence-renewal.pdf"}
    },
    {
        "source_type": "slack",
        "content": "Security incident: Found API keys exposed in a public Notion page. Need better access controls.",
        "metadata": {"author": "Security Team", "channel": "#security-alerts", "url": "slack://channel/security/msg321"}
    },
    {
        "source_type": "video",
        "content": "Transcript: CFO: 'Our SaaS spend is out of control. I'm seeing duplicate tools everywhere.'",
        "metadata": {"author": "CFO", "channel": "Board Meeting", "url": "zoom://recordings/board-q4"}
    },
    {
        "source_type": "doc",
        "content": "Employee Survey Results: 67% of employees report confusion about which platform to use for documentation.",
        "metadata": {"author": "HR Analytics", "page_no": 12, "url": "gdrive://surveys/employee-2024"}
    },
    {
        "source_type": "slack",
        "content": "Just spent 30 minutes looking for a doc. Found it was in Confluence when I was searching Notion the whole time.",
        "metadata": {"author": "Alex Rivera", "channel": "#general", "url": "slack://channel/general/msg555"}
    },
    {
        "source_type": "pdf",
        "content": "IT Asset Report: Active SaaS Subscriptions - Notion (450 seats), Confluence (480 seats), Google Docs (500 seats)",
        "metadata": {"author": "IT Department", "page_no": 7, "url": "s3://reports/saas-audit-2024.pdf"}
    },
    {
        "source_type": "video",
        "content": "Transcript: Product Manager: 'Our product specs are scattered across three different tools. This is unsustainable.'",
        "metadata": {"author": "Lisa Park", "channel": "Product Sync", "url": "zoom://recordings/product-sync-weekly"}
    },
    {
        "source_type": "doc",
        "content": "Cost Optimization Opportunities: Consolidating documentation tools could save $45,000 annually.",
        "metadata": {"author": "Finance Team", "page_no": 5, "url": "gdrive://reports/cost-optimization"}
    },
    {
        "source_type": "slack",
        "content": "New hire onboarding feedback: 'Too many tools to learn. Not clear where things live.'",
        "metadata": {"author": "Taylor Wong", "channel": "#people-ops", "url": "slack://channel/people-ops/msg888"}
    },
    {
        "source_type": "pdf",
        "content": "Security Audit Findings: Multiple documentation platforms increase attack surface and compliance risk.",
        "metadata": {"author": "Security Auditor", "page_no": 15, "url": "s3://audits/security-review-2024.pdf"}
    }
]

def generate_embedding(text: str) -> List[float]:
    import random
    return [random.random() for _ in range(1536)]

async def ingest_mock_data() -> Dict[str, Any]:
    supabase = get_supabase_client()
    objects_created = 0

    for file_data in MOCK_FILES:
        nexus_obj = {
            "id": str(uuid.uuid4()),
            "source_type": file_data["source_type"],
            "timestamp": datetime.utcnow().isoformat(),
            "raw_content": file_data["content"],
            "vector_embedding": generate_embedding(file_data["content"]),
            "metadata": file_data["metadata"]
        }

        supabase.table("nexus_objects").insert(nexus_obj).execute()
        objects_created += 1

    return {
        "status": "success",
        "files_processed": len(MOCK_FILES),
        "objects_created": objects_created,
        "message": f"Successfully ingested {objects_created} objects into the Universal Data Layer"
    }
