# Incident API routes for triggering and retrieving incidents
# Connects to POST /api/incidents/trigger and GET /api/incidents/{id}
# Includes automated analysis and fix PR creation

from fastapi import APIRouter, HTTPException, BackgroundTasks
from uuid import uuid4
from datetime import datetime
import os
from app.models.schemas import (
    IncidentTriggerRequest,
    IncidentResponse,
    IncidentDetail
)
from app.shared.data.supabase_store import supabase_store

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

# Configuration: Enable/disable auto-fix PR creation
AUTO_ANALYZE_ENABLED = os.getenv("AUTO_ANALYZE_INCIDENTS", "true").lower() == "true"
AUTO_CREATE_FIX_PR = os.getenv("AUTO_CREATE_FIX_PR", "true").lower() == "true"


async def auto_analyze_and_fix(incident_id: str):
    """
    Background task: Automatically analyze incident and create fix PR.

    This runs asynchronously after incident creation:
    1. Analyze incident with full context
    2. Create fix PR if analysis succeeds
    3. Log results to console

    Failures are logged but don't block incident creation.
    """
    from app.shared.services.ai_service import ai_service
    from app.shared.services.github_service import github_service

    print(f"[AUTO-FIX] Starting automated workflow for {incident_id}")

    try:
        # Step 1: Analyze incident
        if not AUTO_ANALYZE_ENABLED:
            print(f"[AUTO-FIX] Auto-analysis disabled, skipping")
            return

        print(f"[AUTO-FIX] Running analysis...")

        # Fetch incident
        incident = supabase_store.get_incident(incident_id)
        if not incident or not incident.coding_context:
            print(f"[AUTO-FIX] No coding context, skipping auto-fix")
            return

        # Fetch session
        session_result = supabase_store.client.table("ai_sessions").select("*").eq(
            "id", incident.coding_context.session_id if hasattr(incident.coding_context, 'session_id') else None
        ).execute()
        session = session_result.data[0] if session_result.data else {}

        # Fetch decisions
        decisions_result = supabase_store.client.table("ai_decisions").select("*").eq(
            "session_id", session.get('id')
        ).order("timestamp").execute() if session.get('id') else None
        decisions = decisions_result.data if decisions_result and decisions_result.data else []

        # Fetch transcripts
        transcripts_result = supabase_store.client.table("transcripts").select("*").eq(
            "session_id", session.get('id')
        ).order("timestamp").execute() if session.get('id') else None
        transcripts = transcripts_result.data if transcripts_result and transcripts_result.data else []

        # Fetch PR
        pr_result = supabase_store.client.table("pull_requests").select("*").eq(
            "pr_id", incident.related_pr.pr_id if incident.related_pr else None
        ).execute() if incident.related_pr else None
        pr = pr_result.data[0] if pr_result and pr_result.data else {}

        # Fetch deployment
        deployment_result = supabase_store.client.table("deployments").select("*").eq(
            "deployment_id", incident.deployment.deployment_id if incident.deployment else None
        ).execute() if incident.deployment else None
        deployment = deployment_result.data[0] if deployment_result and deployment_result.data else {}

        # Run analysis
        analysis = ai_service.analyze_incident_with_full_context(
            incident, session, decisions, transcripts, pr, deployment
        )

        # Store analysis
        analysis_id = f"analysis-{uuid4().hex[:8]}"
        input_packet = {
            "incident": {
                "incident_id": incident.incident_id,
                "title": incident.title,
                "symptoms": incident.symptoms,
                "severity": incident.severity
            },
            "session": session,
            "decisions_count": len(decisions),
            "transcripts_count": len(transcripts),
            "pr": pr,
            "deployment": deployment,
            "automated": True
        }

        supabase_store.client.table("ai_analyses").insert({
            "analysis_id": analysis_id,
            "incident_id": incident_id,
            "input_packet": input_packet,
            "likely_cause": analysis["likely_cause"],
            "risky_assumptions": analysis.get("risky_assumptions", []),
            "suggested_fix": analysis["suggested_fix"],
            "recommended_reviewer": analysis.get("recommended_reviewer"),
            "model_used": "gemini-2.5-flash",
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        print(f"[AUTO-FIX] ✅ Analysis complete: {analysis_id}")

        # Step 2: Create fix PR
        if not AUTO_CREATE_FIX_PR:
            print(f"[AUTO-FIX] Auto PR creation disabled, stopping here")
            return

        print(f"[AUTO-FIX] Creating fix PR...")

        repo = session.get("repo", "SynAeri/Playcrowd")
        incident_short_id = incident_id.split('-')[-1]
        branch_name = f"fix/incident-{incident_short_id}"
        pr_title = f"Fix: {incident.title}"

        pr_body = f"""## Automated Incident Resolution 🤖

**Incident:** {incident_id}
**Severity:** {incident.severity}
**Status:** {incident.status}

### Root Cause
{analysis['likely_cause']}

### Risky Assumptions
{chr(10).join('- ' + a for a in analysis.get('risky_assumptions', []))}

### Proposed Fix
{analysis['suggested_fix']}

---
🤖 This PR was **automatically generated** by the incident response system.
- Analysis ID: `{analysis_id}`
- Original coding session: `{session.get('id', 'unknown')}`
- Recommended reviewer: @{analysis.get('recommended_reviewer', 'team')}

**Next Steps:**
1. Review the proposed fix
2. Test in staging environment
3. Merge if approved
"""

        fix_file_content = f"""# Automated Incident Fix: {incident.title}

**Incident ID:** {incident_id}
**Analysis ID:** {analysis_id}
**Generated:** {datetime.utcnow().isoformat()}

## Root Cause
{analysis['likely_cause']}

## Risky Assumptions Identified
{chr(10).join('- ' + a for a in analysis.get('risky_assumptions', []))}

## Proposed Changes
{analysis['suggested_fix']}

## Files to Modify
Based on the analysis, review and apply changes to:
{chr(10).join('- ' + f for f in pr.get('files_changed', [])[:10])}

## Testing Checklist
- [ ] Verify fix resolves: {incident.symptoms}
- [ ] Run existing test suite
- [ ] Add regression test for this incident
- [ ] Test in staging environment
- [ ] Monitor metrics after deployment

## Rollback Plan
If this fix causes issues:
1. Revert this PR
2. Redeploy previous version
3. Investigate further with engineering team

## Context Links
- Original PR: #{pr.get('pr_id', 'N/A')}
- Deployment: {deployment.get('deployment_id', 'N/A')}
- Session: {session.get('id', 'N/A')}
"""

        files_to_change = {
            f"incident-fixes/AUTO_FIX_{incident_short_id}.md": fix_file_content
        }

        # Create PR
        pr_data = await github_service.create_fix_pr(
            repo=repo,
            branch_name=branch_name,
            base_branch="main",
            title=pr_title,
            body=pr_body,
            files_to_change=files_to_change,
            reviewers=[analysis.get('recommended_reviewer')] if analysis.get('recommended_reviewer') and analysis.get('recommended_reviewer') != 'team' else None
        )

        # Store generated PR
        generated_pr_id = f"gen-pr-{uuid4().hex[:8]}"
        supabase_store.client.table("generated_prs").insert({
            "generated_pr_id": generated_pr_id,
            "incident_id": incident_id,
            "analysis_id": analysis_id,
            "github_pr_number": pr_data["pr_number"],
            "github_pr_url": pr_data["pr_url"],
            "branch_name": branch_name,
            "fix_description": analysis['suggested_fix'],
            "files_to_change": list(files_to_change.keys()),
            "status": "created",
            "created_at": datetime.utcnow().isoformat(),
            "metadata": {"automated": True}
        }).execute()

        print(f"[AUTO-FIX] ✅ Fix PR created: #{pr_data['pr_number']}")
        print(f"[AUTO-FIX] 🎉 Automated workflow complete for {incident_id}")

    except Exception as e:
        print(f"[AUTO-FIX] ❌ Error in automated workflow: {e}")
        import traceback
        traceback.print_exc()
        # Don't re-raise - let incident creation succeed even if auto-fix fails


@router.post("/trigger", response_model=IncidentResponse)
async def trigger_incident(request: IncidentTriggerRequest, background_tasks: BackgroundTasks):
    """
    Create an incident tied to a deployment.
    Automatically triggers AI analysis and fix PR creation in background.

    Background workflow (if enabled):
    1. Analyze incident with full context
    2. Create fix PR on GitHub
    3. Store analysis and PR metadata

    Configuration (via environment variables):
    - AUTO_ANALYZE_INCIDENTS=true/false (default: true)
    - AUTO_CREATE_FIX_PR=true/false (default: true)
    """
    try:
        incident_id = f"INC-{datetime.utcnow().strftime('%Y-%m-%d')}-{uuid4().hex[:6]}"

        deployment = supabase_store.get_deployment(request.linked_deployment_id)
        if not deployment:
            raise HTTPException(
                status_code=404,
                detail=f"Deployment {request.linked_deployment_id} not found"
            )

        pr_id = None
        ticket_id = None
        context_id = None

        # Get PR and context from deployment via Supabase
        pr = None
        context = None
        if deployment:
            try:
                # Find PR by commit SHA (or by deployment metadata)
                pr_result = supabase_store.client.table("pull_requests").select("*").eq("commit_sha", deployment.commit_sha).execute()

                # If not found by exact commit match, try finding by deployment's linked PR
                if not pr_result.data:
                    deployment_result = supabase_store.client.table("deployments").select("pr_id").eq("deployment_id", deployment.deployment_id).execute()
                    if deployment_result.data and deployment_result.data[0].get('pr_id'):
                        pr_id = deployment_result.data[0]['pr_id']
                        pr_result = supabase_store.client.table("pull_requests").select("*").eq("pr_id", f"PR-{pr_id}").execute()

                # Last fallback: parse PR number from deployment ID (e.g., "deploy-pr10-...")
                if not pr_result.data and "pr" in deployment.deployment_id.lower():
                    import re
                    match = re.search(r'pr(\d+)', deployment.deployment_id, re.IGNORECASE)
                    if match:
                        pr_number = match.group(1)
                        pr_result = supabase_store.client.table("pull_requests").select("*").eq("pr_id", f"PR-{pr_number}").execute()

                if pr_result.data:
                    pr_data = pr_result.data[0]
                    from app.models.schemas import PRMock
                    pr = PRMock(
                        pr_id=pr_data['pr_id'],
                        title=pr_data['title'],
                        description=pr_data.get('description', ''),
                        author=pr_data['author'],
                        commit_sha=pr_data['commit_sha'],
                        status=pr_data['status'],
                        created_at=datetime.fromisoformat(pr_data['created_at'].replace('Z', '+00:00')),
                        merged_at=datetime.fromisoformat(pr_data['merged_at'].replace('Z', '+00:00')) if pr_data.get('merged_at') else None,
                        files_changed=pr_data.get('files_changed', [])
                    )
                    # Find the best session for this PR (prefer one with transcripts)
                    try:
                        sessions_result = supabase_store.client.table("ai_sessions").select("id").eq("pr_id", pr_data['pr_id'].replace('PR-', '')).execute()
                        if sessions_result.data:
                            # Check each session for transcript count
                            best_session_id = None
                            max_transcripts = 0
                            for session_data in sessions_result.data:
                                sid = session_data['id']
                                transcript_result = supabase_store.client.table("transcripts").select("id", count="exact").eq("session_id", sid).execute()
                                count = transcript_result.count or 0
                                if count > max_transcripts:
                                    max_transcripts = count
                                    best_session_id = sid

                            # Use session with most transcripts, or fall back to pr_data session_id
                            session_to_use = best_session_id if best_session_id else pr_data.get('session_id')
                            if session_to_use:
                                context = supabase_store.get_session_context(session_to_use)
                    except Exception as e:
                        print(f"Error finding best session: {e}")
                        # Fallback to PR's session_id
                        if pr_data.get('session_id'):
                            context = supabase_store.get_session_context(pr_data['session_id'])
            except Exception as e:
                print(f"Error linking PR/session: {e}")

        incident = IncidentDetail(
            incident_id=incident_id,
            title=request.title,
            symptoms=request.symptoms,
            impacted_service=request.impacted_service,
            severity=request.severity,
            status="open",
            created_at=datetime.utcnow(),
            deployment=deployment,
            related_pr=pr,
            coding_context=context
        )

        supabase_store.save_incident(incident)

        # Trigger automated analysis and fix PR creation in background
        if AUTO_ANALYZE_ENABLED and context:
            print(f"[INCIDENT] Triggering automated analysis for {incident_id}")
            background_tasks.add_task(auto_analyze_and_fix, incident_id)
        else:
            print(f"[INCIDENT] Auto-analysis disabled or no context available")

        app_link = f"/incident/{incident_id}"
        slack_link = f"slack://channel?id=C123&message=Incident+{incident_id}+triggered"

        auto_fix_status = "enabled" if AUTO_ANALYZE_ENABLED and AUTO_CREATE_FIX_PR else "disabled"

        return IncidentResponse(
            incident_id=incident_id,
            slack_link=slack_link,
            app_link=app_link,
            message=f"Incident {incident_id} triggered successfully (auto-fix: {auto_fix_status})"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger incident: {str(e)}")


@router.get("/{incident_id}", response_model=IncidentDetail)
async def get_incident(incident_id: str):
    """
    Retrieve full incident details with all linked artifacts:
    deployment, PR, ticket, and coding context.
    """
    incident = supabase_store.get_incident(incident_id)

    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

    return incident


@router.get("", response_model=list[IncidentDetail])
async def list_incidents():
    """List all incidents in the system"""
    return supabase_store.list_incidents()


@router.post("/{incident_id}/analyze")
async def analyze_incident(incident_id: str):
    """
    Perform deep AI analysis on an incident using full context.

    This goes beyond the basic fix draft by incorporating:
    - Full conversation transcripts
    - Decision timeline
    - PR file changes
    - Deployment context

    Stores analysis in ai_analyses table for audit trail.
    """
    from app.shared.services.ai_service import ai_service

    try:
        # 1. Fetch incident with all related data
        incident = supabase_store.get_incident(incident_id)
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

        if not incident.coding_context:
            raise HTTPException(
                status_code=400,
                detail="No coding context linked to this incident. Cannot analyze."
            )

        # 2. Fetch session
        session_result = supabase_store.client.table("ai_sessions").select("*").eq(
            "id", incident.coding_context.session_id if hasattr(incident.coding_context, 'session_id') else None
        ).execute()

        session = session_result.data[0] if session_result.data else {}

        # 3. Fetch decisions
        decisions_result = supabase_store.client.table("ai_decisions").select("*").eq(
            "session_id", session.get('id')
        ).order("timestamp").execute() if session.get('id') else None

        decisions = decisions_result.data if decisions_result and decisions_result.data else []

        # 4. Fetch transcripts
        transcripts_result = supabase_store.client.table("transcripts").select("*").eq(
            "session_id", session.get('id')
        ).order("timestamp").execute() if session.get('id') else None

        transcripts = transcripts_result.data if transcripts_result and transcripts_result.data else []

        # 5. Fetch PR
        pr_result = supabase_store.client.table("pull_requests").select("*").eq(
            "pr_id", incident.related_pr.pr_id if incident.related_pr else None
        ).execute() if incident.related_pr else None

        pr = pr_result.data[0] if pr_result and pr_result.data else {}

        # 6. Fetch deployment
        deployment_result = supabase_store.client.table("deployments").select("*").eq(
            "deployment_id", incident.deployment.deployment_id if incident.deployment else None
        ).execute() if incident.deployment else None

        deployment = deployment_result.data[0] if deployment_result and deployment_result.data else {}

        # 7. Call enhanced AI analysis
        print(f"[ANALYZE] Analyzing incident {incident_id}")
        print(f"[ANALYZE] Session: {session.get('id', 'none')}, Decisions: {len(decisions)}, Transcripts: {len(transcripts)}")

        analysis = ai_service.analyze_incident_with_full_context(
            incident, session, decisions, transcripts, pr, deployment
        )

        # 8. Store analysis
        analysis_id = f"analysis-{uuid4().hex[:8]}"

        input_packet = {
            "incident": {
                "incident_id": incident.incident_id,
                "title": incident.title,
                "symptoms": incident.symptoms,
                "severity": incident.severity
            },
            "session": session,
            "decisions_count": len(decisions),
            "transcripts_count": len(transcripts),
            "pr": pr,
            "deployment": deployment
        }

        supabase_store.client.table("ai_analyses").insert({
            "analysis_id": analysis_id,
            "incident_id": incident_id,
            "input_packet": input_packet,
            "likely_cause": analysis["likely_cause"],
            "risky_assumptions": analysis.get("risky_assumptions", []),
            "suggested_fix": analysis["suggested_fix"],
            "recommended_reviewer": analysis.get("recommended_reviewer"),
            "model_used": "gemini-2.5-flash",
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        return {
            "analysis_id": analysis_id,
            "incident_id": incident_id,
            "likely_cause": analysis["likely_cause"],
            "risky_assumptions": analysis.get("risky_assumptions", []),
            "suggested_fix": analysis["suggested_fix"],
            "recommended_reviewer": analysis.get("recommended_reviewer"),
            "message": "Analysis completed and stored successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/{incident_id}/create-fix-pr")
async def create_fix_pr(incident_id: str):
    """
    Creates a GitHub PR with AI-generated fix for an incident.

    Workflow:
    1. Fetch incident and latest analysis
    2. Generate branch name and PR title
    3. Use GitHub API to create branch and PR
    4. Link generated PR to incident
    5. Webhook will auto-ingest the new PR

    Returns PR URL and number.
    """
    from app.shared.services.github_service import github_service

    try:
        # 1. Fetch incident
        incident = supabase_store.get_incident(incident_id)
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

        # 2. Fetch latest analysis
        analysis_result = supabase_store.client.table("ai_analyses").select("*").eq(
            "incident_id", incident_id
        ).order("created_at", desc=True).limit(1).execute()

        if not analysis_result.data:
            raise HTTPException(
                status_code=400,
                detail="No analysis found. Run /analyze first."
            )

        analysis = analysis_result.data[0]

        # 3. Get session to extract repo info
        session_result = supabase_store.client.table("ai_sessions").select("*").eq(
            "id", incident.coding_context.session_id if incident.coding_context and hasattr(incident.coding_context, 'session_id') else None
        ).execute()

        if not session_result.data:
            raise HTTPException(
                status_code=400,
                detail="No session linked to incident"
            )

        session = session_result.data[0]
        repo = session.get("repo", "SynAeri/Playcrowd")  # Default to sandbox repo

        # 4. Generate branch name and PR details
        incident_short_id = incident_id.split('-')[-1]
        branch_name = f"fix/incident-{incident_short_id}"
        pr_title = f"Fix: {incident.title}"

        pr_body = f"""## Incident Resolution

**Incident:** {incident_id}
**Severity:** {incident.severity}

### Root Cause
{analysis['likely_cause']}

### Risky Assumptions
{chr(10).join('- ' + a for a in analysis.get('risky_assumptions', []))}

### Proposed Fix
{analysis['suggested_fix']}

---
🤖 This PR was generated by AI incident analysis.
Original coding session: {session.get('id', 'unknown')}
Recommended reviewer: @{analysis.get('recommended_reviewer', 'team')}
"""

        # 5. Create placeholder fix file
        # In production, LLM should return actual code changes
        fix_file_content = f"""# Incident Fix: {incident.title}

**Incident ID:** {incident_id}
**Generated:** {datetime.utcnow().isoformat()}

## Root Cause
{analysis['likely_cause']}

## Proposed Changes
{analysis['suggested_fix']}

## Files to Modify
Review the analysis and apply changes to the appropriate files.

## Testing
- [ ] Verify fix resolves the incident symptoms
- [ ] Run existing tests
- [ ] Add regression test if applicable

## Rollback Plan
Document rollback steps if needed.
"""

        files_to_change = {
            f"incident-fixes/INCIDENT_{incident_short_id}_FIX.md": fix_file_content
        }

        # 6. Create PR via GitHub API
        print(f"[CREATE-FIX-PR] Creating PR for incident {incident_id}")
        print(f"[CREATE-FIX-PR] Repo: {repo}, Branch: {branch_name}")

        pr_data = await github_service.create_fix_pr(
            repo=repo,
            branch_name=branch_name,
            base_branch="main",
            title=pr_title,
            body=pr_body,
            files_to_change=files_to_change,
            reviewers=[analysis.get('recommended_reviewer')] if analysis.get('recommended_reviewer') and analysis.get('recommended_reviewer') != 'team' else None
        )

        # 7. Store generated PR record
        generated_pr_id = f"gen-pr-{uuid4().hex[:8]}"
        supabase_store.client.table("generated_prs").insert({
            "generated_pr_id": generated_pr_id,
            "incident_id": incident_id,
            "analysis_id": analysis['analysis_id'],
            "github_pr_number": pr_data["pr_number"],
            "github_pr_url": pr_data["pr_url"],
            "branch_name": branch_name,
            "fix_description": analysis['suggested_fix'],
            "files_to_change": list(files_to_change.keys()),
            "status": "created",
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        return {
            "generated_pr_id": generated_pr_id,
            "github_pr_number": pr_data["pr_number"],
            "github_pr_url": pr_data["pr_url"],
            "branch_name": branch_name,
            "message": f"Fix PR #{pr_data['pr_number']} created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PR creation failed: {str(e)}")
