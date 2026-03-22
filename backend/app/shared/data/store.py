# In-memory data store for hackathon MVP
# For demo purposes - stores all context, incidents, PRs, deployments, and fixes
# In production, this would be replaced with a proper database

from typing import Dict, Optional
from app.models.schemas import (
    CodingContextSummary, PRMock, DeploymentRecord,
    TicketMock, IncidentDetail, FixDraftResponse
)

class DataStore:
    """Singleton in-memory store for all demo data"""

    def __init__(self):
        self.contexts: Dict[str, CodingContextSummary] = {}
        self.prs: Dict[str, PRMock] = {}
        self.deployments: Dict[str, DeploymentRecord] = {}
        self.tickets: Dict[str, TicketMock] = {}
        self.incidents: Dict[str, IncidentDetail] = {}
        self.fixes: Dict[str, FixDraftResponse] = {}
        self.transcripts = []  # List of transcript messages

    def save_context(self, context_id: str, context: CodingContextSummary) -> None:
        """Save coding context summary"""
        self.contexts[context_id] = context

    def get_context(self, context_id: str) -> Optional[CodingContextSummary]:
        """Retrieve coding context by ID"""
        return self.contexts.get(context_id)

    def save_pr(self, pr: PRMock) -> None:
        """Save PR mock"""
        self.prs[pr.pr_id] = pr

    def get_pr(self, pr_id: str) -> Optional[PRMock]:
        """Retrieve PR by ID"""
        return self.prs.get(pr_id)

    def save_deployment(self, deployment: DeploymentRecord) -> None:
        """Save deployment record"""
        self.deployments[deployment.deployment_id] = deployment

    def get_deployment(self, deployment_id: str) -> Optional[DeploymentRecord]:
        """Retrieve deployment by ID"""
        return self.deployments.get(deployment_id)

    def save_ticket(self, ticket: TicketMock) -> None:
        """Save ticket mock"""
        self.tickets[ticket.ticket_id] = ticket

    def get_ticket(self, ticket_id: str) -> Optional[TicketMock]:
        """Retrieve ticket by ID"""
        return self.tickets.get(ticket_id)

    def save_incident(self, incident: IncidentDetail) -> None:
        """Save incident"""
        self.incidents[incident.incident_id] = incident

    def get_incident(self, incident_id: str) -> Optional[IncidentDetail]:
        """Retrieve incident by ID"""
        return self.incidents.get(incident_id)

    def save_fix(self, fix: FixDraftResponse) -> None:
        """Save drafted fix"""
        self.fixes[fix.draft_id] = fix

    def get_fix(self, draft_id: str) -> Optional[FixDraftResponse]:
        """Retrieve fix draft by ID"""
        return self.fixes.get(draft_id)

    def clear_all(self) -> None:
        """Clear all data (useful for testing)"""
        self.contexts.clear()
        self.prs.clear()
        self.deployments.clear()
        self.tickets.clear()
        self.incidents.clear()
        self.fixes.clear()
        self.transcripts.clear()


# Global singleton instance
store = DataStore()
