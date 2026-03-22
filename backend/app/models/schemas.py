# Data models for AI-Powered Incident Response Platform
# Defines all objects needed for the golden road demo: context, incidents, PRs, deployments, fixes

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime
from uuid import UUID, uuid4

# ===== Coding Context Models =====

class CodingContextSummary(BaseModel):
    """Summary of a Claude coding session with decisions, assumptions, and changes"""
    summary: str
    decisions: List[str]
    assumptions: List[str]
    files_changed: List[str]
    linked_pr_id: Optional[str] = None
    linked_ticket_id: Optional[str] = None
    linked_deployment_id: Optional[str] = None
    intended_outcome: str
    session_timestamp: datetime = Field(default_factory=datetime.utcnow)
    session_id: Optional[str] = None

class CodingContextRequest(BaseModel):
    """Request to save coding context - accepts either transcript or structured data"""
    transcript: Optional[str] = None
    structured: Optional[CodingContextSummary] = None

class CodingContextResponse(BaseModel):
    """Response after saving coding context"""
    context_id: str
    message: str
    linked_artifacts: Dict[str, str]


# ===== Artifact Models (PR, Deployment, Ticket) =====

class PRMock(BaseModel):
    """Mock Pull Request object"""
    pr_id: str
    title: str
    description: Optional[str] = None
    author: str
    commit_sha: str
    files_changed: List[str]
    status: Literal["open", "merged", "closed"] = "open"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    merged_at: Optional[datetime] = None

class DeploymentRecord(BaseModel):
    """Deployment tracking record"""
    deployment_id: str
    commit_sha: str
    environment: Literal["development", "staging", "production"]
    service_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: Literal["pending", "success", "failed"] = "success"
    deployed_by: str

class TicketMock(BaseModel):
    """Mock ticket/issue object"""
    ticket_id: str
    title: str
    description: str
    assignee: str
    status: Literal["open", "in_progress", "closed"] = "open"
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ===== Incident Models =====

class IncidentTriggerRequest(BaseModel):
    """Request to create a fake incident"""
    title: str
    symptoms: str
    impacted_service: str
    severity: Literal["low", "medium", "high", "critical"] = "high"
    linked_deployment_id: str

class IncidentResponse(BaseModel):
    """Response after triggering an incident"""
    incident_id: str
    slack_link: Optional[str] = None
    app_link: str
    message: str

class IncidentDetail(BaseModel):
    """Full incident details with all linked artifacts"""
    incident_id: str
    title: str
    symptoms: str
    impacted_service: str
    severity: Literal["low", "medium", "high", "critical"]
    status: Literal["open", "investigating", "resolved"] = "open"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Linked artifacts
    deployment: Optional[DeploymentRecord] = None
    related_pr: Optional[PRMock] = None
    related_ticket: Optional[TicketMock] = None
    coding_context: Optional[CodingContextSummary] = None


# ===== Fix Drafting Models =====

class FixDraftRequest(BaseModel):
    """Request to draft a fix for an incident"""
    incident_id: str

class FixDraftResponse(BaseModel):
    """AI-generated fix draft with analysis"""
    incident_id: str
    analysis: str
    probable_cause: str
    proposed_fix: str
    code_changes: Optional[str] = None
    patch_notes: str
    reviewer: str
    review_state: Literal["pending", "in_review", "approved", "rejected"] = "pending"
    draft_id: str
    mock_pr_id: Optional[str] = None


# ===== Review Models =====

class ReviewAssignRequest(BaseModel):
    """Request to assign a fix for review"""
    draft_id: str
    reviewer: str
    comment: Optional[str] = None

class ReviewAssignResponse(BaseModel):
    """Response after assigning review"""
    draft_id: str
    reviewer: str
    review_state: Literal["pending", "in_review", "approved", "rejected"]
    message: str


# ===== GitHub Webhook Models =====

class GitHubWebhookPR(BaseModel):
    """GitHub webhook payload for pull request events"""
    action: str
    number: int
    pull_request: Dict[str, Any]
    repository: Dict[str, Any]
    sender: Dict[str, Any]


# ===== AI Session Models (MCP Skill Integration) =====

class AISession(BaseModel):
    """AI coding session from MCP skill"""
    id: str
    repo: str
    branch: str
    agent: str = "claude"
    engineer: Optional[str] = None
    ticket_id: Optional[str] = None
    started_at: str
    ended_at: Optional[str] = None
    pr_id: Optional[str] = None
    decision_count: int = 0
    pr_milestones: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = None

class AIDecision(BaseModel):
    """AI decision logged during coding session"""
    id: str
    session_id: str
    summary: str
    reasoning: str
    impact: Literal["low", "medium", "high"]
    files_changed: List[str] = Field(default_factory=list)
    ticket_id: Optional[str] = None
    timestamp: str
    pr_milestone: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

class AISessionEndRequest(BaseModel):
    """Request to end an AI session"""
    ended_at: str
    pr_id: Optional[str] = None


# ===== Demo Packet Model =====

class DemoPacket(BaseModel):
    """Complete seeded demo dataset for golden road"""
    coding_context: CodingContextSummary
    pr: PRMock
    deployment: DeploymentRecord
    ticket: TicketMock
    incident: IncidentDetail
    drafted_fix: Optional[FixDraftResponse] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
