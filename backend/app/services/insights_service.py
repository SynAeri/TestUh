# Insights service for generating ROI and optimization recommendations
# Returns hardcoded insights demonstrating tool overlap and cost savings (StackSync logic)

from datetime import datetime
from typing import Dict, Any

def get_insights() -> Dict[str, Any]:
    return {
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
        "generated_at": datetime.utcnow().isoformat()
    }
