# Supabase-based data store for incident response platform
# Replaces in-memory store with real database queries
# Connects AI sessions from MCP server to incidents, PRs, and deployments

from typing import Dict, Optional, List
from datetime import datetime
from app.models.schemas import (
    CodingContextSummary, PRMock, DeploymentRecord,
    TicketMock, IncidentDetail, FixDraftResponse
)

# Try to import Supabase, but make it optional
try:
    from app.config.supabase import get_supabase_client
    SUPABASE_AVAILABLE = True
except Exception as e:
    print(f"Warning: Supabase not available: {e}")
    SUPABASE_AVAILABLE = False
    get_supabase_client = None


class SupabaseStore:
    """Supabase-backed data store for production incident management"""

    def __init__(self):
        if SUPABASE_AVAILABLE:
            try:
                self.client = get_supabase_client()
                self.available = True
                print("SupabaseStore: Connected to Supabase")
            except Exception as e:
                print(f"Warning: Failed to connect to Supabase: {e}")
                self.client = None
                self.available = False
        else:
            self.client = None
            self.available = False
            print("SupabaseStore: Running without Supabase (will return empty data)")

    # ===============================
    # AI SESSIONS & CONTEXT
    # ===============================

    def get_session_context(self, session_id: str) -> Optional[CodingContextSummary]:
        """
        Build coding context from AI session and decisions.
        This replaces the old transcript-based approach.
        """
        if not self.available:
            return None

        try:
            # Get session
            session_result = self.client.table("ai_sessions").select("*").eq("id", session_id).execute()
            if not session_result.data:
                return None

            session = session_result.data[0]

            # Get all decisions for this session
            decisions_result = self.client.table("ai_decisions").select("*").eq("session_id", session_id).order("timestamp").execute()
            decisions = decisions_result.data

            # Build context summary from session + decisions
            context = CodingContextSummary(
                summary=f"AI coding session on {session['repo']} ({session['branch']}) by {session.get('engineer', 'AI Agent')}",
                decisions=[d['summary'] for d in decisions],
                assumptions=[d['reasoning'] for d in decisions if d['impact'] == 'high'],
                files_changed=list(set(file for d in decisions for file in d.get('files_changed', []))),
                linked_pr_id=session.get('pr_id'),
                linked_ticket_id=session.get('ticket_id'),
                intended_outcome=f"Complete work on ticket {session.get('ticket_id', 'N/A')}",
                session_timestamp=datetime.fromisoformat(session['started_at'].replace('Z', '+00:00')),
                session_id=session_id
            )

            return context

        except Exception as e:
            print(f"Error getting session context: {e}")
            return None

    # ===============================
    # PULL REQUESTS
    # ===============================

    def save_pr(self, pr: PRMock, session_id: Optional[str] = None) -> None:
        """Save PR to Supabase"""
        try:
            self.client.table("pull_requests").upsert({
                "pr_id": pr.pr_id,
                "title": pr.title,
                "description": pr.description,
                "author": pr.author,
                "commit_sha": pr.commit_sha,
                "status": pr.status,
                "created_at": pr.created_at.isoformat(),
                "merged_at": pr.merged_at.isoformat() if pr.merged_at else None,
                "files_changed": pr.files_changed,
                "session_id": session_id
            }).execute()
        except Exception as e:
            print(f"Error saving PR: {e}")

    def get_pr(self, pr_id: str) -> Optional[PRMock]:
        """Get PR from Supabase"""
        try:
            result = self.client.table("pull_requests").select("*").eq("pr_id", pr_id).execute()
            if not result.data:
                return None

            data = result.data[0]
            return PRMock(
                pr_id=data['pr_id'],
                title=data['title'],
                description=data.get('description', ''),
                author=data['author'],
                commit_sha=data['commit_sha'],
                status=data['status'],
                created_at=datetime.fromisoformat(data['created_at'].replace('Z', '+00:00')),
                merged_at=datetime.fromisoformat(data['merged_at'].replace('Z', '+00:00')) if data.get('merged_at') else None,
                files_changed=data.get('files_changed', [])
            )
        except Exception as e:
            print(f"Error getting PR: {e}")
            return None

    def get_pr_by_session(self, session_id: str) -> Optional[PRMock]:
        """Get PR associated with a session"""
        try:
            result = self.client.table("pull_requests").select("*").eq("session_id", session_id).execute()
            if not result.data:
                return None
            data = result.data[0]
            return PRMock(
                pr_id=data['pr_id'],
                title=data['title'],
                description=data.get('description', ''),
                author=data['author'],
                commit_sha=data['commit_sha'],
                status=data['status'],
                created_at=datetime.fromisoformat(data['created_at'].replace('Z', '+00:00')),
                merged_at=datetime.fromisoformat(data['merged_at'].replace('Z', '+00:00')) if data.get('merged_at') else None,
                files_changed=data.get('files_changed', [])
            )
        except Exception as e:
            print(f"Error getting PR by session: {e}")
            return None

    # ===============================
    # DEPLOYMENTS
    # ===============================

    def save_deployment(self, deployment: DeploymentRecord, session_id: Optional[str] = None, pr_id: Optional[str] = None) -> None:
        """Save deployment to Supabase"""
        try:
            self.client.table("deployments").upsert({
                "deployment_id": deployment.deployment_id,
                "commit_sha": deployment.commit_sha,
                "environment": deployment.environment,
                "service_name": deployment.service_name,
                "deployed_by": deployment.deployed_by,
                "timestamp": deployment.timestamp.isoformat(),
                "status": deployment.status,
                "session_id": session_id,
                "pr_id": pr_id
            }).execute()
        except Exception as e:
            print(f"Error saving deployment: {e}")

    def get_deployment(self, deployment_id: str) -> Optional[DeploymentRecord]:
        """Get deployment from Supabase"""
        try:
            result = self.client.table("deployments").select("*").eq("deployment_id", deployment_id).execute()
            if not result.data:
                return None

            data = result.data[0]
            return DeploymentRecord(
                deployment_id=data['deployment_id'],
                commit_sha=data['commit_sha'],
                environment=data['environment'],
                service_name=data['service_name'],
                deployed_by=data['deployed_by'],
                timestamp=datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00')),
                status=data['status']
            )
        except Exception as e:
            print(f"Error getting deployment: {e}")
            return None

    # ===============================
    # INCIDENTS
    # ===============================

    def save_incident(self, incident: IncidentDetail) -> None:
        """Save incident to Supabase with all relationships"""
        try:
            # Extract IDs from nested objects
            deployment_id = incident.deployment.deployment_id if incident.deployment else None
            pr_id = incident.related_pr.pr_id if incident.related_pr else None

            # Get session_id from PR if available
            session_id = None
            if pr_id:
                pr_result = self.client.table("pull_requests").select("session_id").eq("pr_id", pr_id).execute()
                if pr_result.data:
                    session_id = pr_result.data[0].get('session_id')

            self.client.table("incidents").upsert({
                "incident_id": incident.incident_id,
                "title": incident.title,
                "symptoms": incident.symptoms,
                "impacted_service": incident.impacted_service,
                "severity": incident.severity,
                "status": incident.status,
                "created_at": incident.created_at.isoformat(),
                "deployment_id": deployment_id,
                "pr_id": pr_id,
                "session_id": session_id
            }).execute()
        except Exception as e:
            print(f"Error saving incident: {e}")

    def get_incident(self, incident_id: str) -> Optional[IncidentDetail]:
        """Get incident with full context from Supabase"""
        if not self.available:
            return None

        try:
            # Get incident with joins
            result = self.client.table("incidents").select("*").eq("incident_id", incident_id).execute()
            if not result.data:
                return None

            data = result.data[0]

            # Get related entities
            deployment = self.get_deployment(data['deployment_id']) if data.get('deployment_id') else None
            pr = self.get_pr(data['pr_id']) if data.get('pr_id') else None
            coding_context = self.get_session_context(data['session_id']) if data.get('session_id') else None

            return IncidentDetail(
                incident_id=data['incident_id'],
                title=data['title'],
                symptoms=data['symptoms'],
                impacted_service=data['impacted_service'],
                severity=data['severity'],
                status=data['status'],
                created_at=datetime.fromisoformat(data['created_at'].replace('Z', '+00:00')),
                deployment=deployment,
                related_pr=pr,
                coding_context=coding_context
            )
        except Exception as e:
            print(f"Error getting incident: {e}")
            return None

    def list_incidents(self) -> List[Dict]:
        """List all incidents (simplified for list view)"""
        if not self.available:
            return []

        try:
            result = self.client.table("incidents").select("incident_id, title, symptoms, impacted_service, severity, status, created_at").order("created_at", desc=True).execute()
            return result.data or []
        except Exception as e:
            print(f"Error listing incidents: {e}")
            return []

    # ===============================
    # FIX DRAFTS
    # ===============================

    def save_fix(self, fix: FixDraftResponse) -> None:
        """Save AI-drafted fix to Supabase"""
        try:
            self.client.table("fix_drafts").upsert({
                "draft_id": fix.draft_id,
                "incident_id": fix.incident_id,
                "analysis": fix.analysis,
                "probable_cause": fix.probable_cause,
                "proposed_fix": fix.proposed_fix,
                "patch_notes": fix.patch_notes,
                "code_changes": fix.code_changes,
                "reviewer": fix.reviewer,
                "review_state": fix.review_state
            }).execute()
        except Exception as e:
            print(f"Error saving fix: {e}")

    def get_fix(self, draft_id: str) -> Optional[FixDraftResponse]:
        """Get fix draft from Supabase"""
        try:
            result = self.client.table("fix_drafts").select("*").eq("draft_id", draft_id).execute()
            if not result.data:
                return None

            data = result.data[0]
            return FixDraftResponse(
                draft_id=data['draft_id'],
                incident_id=data['incident_id'],
                analysis=data['analysis'],
                probable_cause=data['probable_cause'],
                proposed_fix=data['proposed_fix'],
                patch_notes=data['patch_notes'],
                code_changes=data.get('code_changes'),
                reviewer=data.get('reviewer'),
                review_state=data['review_state']
            )
        except Exception as e:
            print(f"Error getting fix: {e}")
            return None

    def update_fix_review_state(self, draft_id: str, reviewer: str, review_state: str) -> None:
        """Update fix review assignment"""
        try:
            self.client.table("fix_drafts").update({
                "reviewer": reviewer,
                "review_state": review_state
            }).eq("draft_id", draft_id).execute()
        except Exception as e:
            print(f"Error updating fix review state: {e}")


# Global singleton instance
supabase_store = SupabaseStore()
