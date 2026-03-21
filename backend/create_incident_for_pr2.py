#!/usr/bin/env python3
# Creates complete incident pipeline for PR #2 with real AI session data

import os
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

print("Creating incident pipeline for PR #2...\n")

# Step 1: Get PR #2 and session data
print("1. Fetching PR #2 from Supabase...")
pr_result = supabase.table("pull_requests").select("*").eq("pr_id", "PR-2").execute()
if not pr_result.data:
    print("✗ PR #2 not found!")
    exit(1)

pr = pr_result.data[0]
session_id = pr["session_id"]
print(f"✓ Found PR #2: {pr['title']}")
print(f"  Session: {session_id}")

# Step 2: Create deployment
print("\n2. Creating deployment record...")
deployment_id = f"deploy-pr2-{datetime.utcnow().strftime('%Y%m%d%H%M')}"
deployment_data = {
    "deployment_id": deployment_id,
    "commit_sha": pr["commit_sha"],
    "environment": "production",
    "service_name": "Playcrowd Website",
    "timestamp": datetime.utcnow().isoformat(),
    "status": "success",
    "deployed_by": "Auto Deploy",
    "pr_id": pr["pr_id"],
    "session_id": session_id
}

supabase.table("deployments").insert(deployment_data).execute()
print(f"✓ Created deployment: {deployment_id}")

# Step 3: Create incident
print("\n3. Creating incident...")
incident_id = f"INC-{datetime.utcnow().strftime('%Y-%m-%d')}-liminal"
incident_data = {
    "incident_id": incident_id,
    "title": "Pear rotation speed causing user confusion",
    "symptoms": "Users report the Teto pear spins too fast after recent design update. Multiple complaints received about dizziness and disorientation.",
    "impacted_service": "Playcrowd Website - Liminal Design",
    "severity": "medium",
    "status": "open",
    "created_at": datetime.utcnow().isoformat(),
    "deployment_id": deployment_id,
    "pr_id": pr["pr_id"],
    "session_id": session_id
}

supabase.table("incidents").insert(incident_data).execute()
print(f"✓ Created incident: {incident_id}")

# Step 4: Verify AI decisions are linked
print("\n4. Verifying AI decisions...")
decisions = supabase.table("ai_decisions").select("*").eq("session_id", session_id).execute()
print(f"✓ Found {len(decisions.data)} AI decisions linked to this incident")

for i, decision in enumerate(decisions.data, 1):
    print(f"  {i}. [{decision['impact'].upper()}] {decision['summary'][:60]}")

print(f"\n✅ Complete incident pipeline created!")
print(f"\nIncident Details:")
print(f"  ID: {incident_id}")
print(f"  Linked to PR: #{pr['pr_id'].replace('PR-', '')}")
print(f"  Linked to Session: {session_id}")
print(f"  AI Decisions: {len(decisions.data)}")

print(f"\n🌐 View in frontend:")
print(f"   http://localhost:3000")
print(f"   http://localhost:3000/incident?id={incident_id}")

print(f"\n📊 Or via API:")
print(f"   curl 'https://unflattering-elinor-distinctively.ngrok-free.dev/api/incidents/{incident_id}'")
