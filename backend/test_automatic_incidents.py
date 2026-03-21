#!/usr/bin/env python3
# Test script for automatic incident detection pipeline
# Simulates errors and deployments to demonstrate auto-incident creation

import requests
import time
from datetime import datetime

BACKEND_URL = "https://unflattering-elinor-distinctively.ngrok-free.dev"
HEADERS = {"ngrok-skip-browser-warning": "true"}

print("=" * 60)
print("AUTOMATIC INCIDENT DETECTION PIPELINE TEST")
print("=" * 60)
print()

# Step 1: Log a deployment
print("STEP 1: Logging deployment...")
print("-" * 60)
deploy_response = requests.post(
    f"{BACKEND_URL}/api/monitoring/deploy",
    headers=HEADERS,
    json={
        "service_name": "Playcrowd Website",
        "commit_sha": "abc123def456",
        "environment": "production",
        "deployed_by": "github-actions",
        "pr_number": 2,  # Links to PR #2
        "branch": "jordan"
    }
)

if deploy_response.status_code == 200:
    deploy_data = deploy_response.json()
    print(f"✓ Deployment logged: {deploy_data['deployment_id']}")
    print(f"  Linked PR: {deploy_data.get('linked_pr', 'None')}")
    print(f"  Linked Session: {deploy_data.get('linked_session', 'None')}")
else:
    print(f"✗ Failed to log deployment: {deploy_response.status_code}")
    print(f"  {deploy_response.text}")

print()

# Step 2: Send 3 errors to trigger automatic incident creation
print("STEP 2: Simulating error spike (3 errors in 5 minutes)...")
print("-" * 60)

errors = [
    {
        "service_name": "Playcrowd Website",
        "error_message": "Animation frame rate dropping below 30fps",
        "error_type": "PerformanceError",
        "environment": "production",
        "request_path": "/liminal"
    },
    {
        "service_name": "Playcrowd Website",
        "error_message": "Framer Motion causing layout shift",
        "error_type": "RenderError",
        "environment": "production",
        "request_path": "/liminal"
    },
    {
        "service_name": "Playcrowd Website",
        "error_message": "Pear rotation animation stuttering",
        "error_type": "AnimationError",
        "environment": "production",
        "request_path": "/liminal"
    }
]

incident_created = False
incident_id = None

for i, error in enumerate(errors, 1):
    print(f"\nError {i}/3: {error['error_message']}")

    error_response = requests.post(
        f"{BACKEND_URL}/api/monitoring/error",
        headers=HEADERS,
        json=error
    )

    if error_response.status_code == 200:
        error_data = error_response.json()
        print(f"  Status: {error_data['status']}")
        print(f"  Error count: {error_data['error_count']}/3")

        if error_data['status'] == 'incident_created':
            incident_created = True
            incident_id = error_data['incident_id']
            print(f"  🚨 INCIDENT AUTO-CREATED: {incident_id}")
            print(f"  Link: {error_data['incident_link']}")
    else:
        print(f"  ✗ Failed: {error_response.status_code}")

    time.sleep(0.5)

print()
print("=" * 60)

if incident_created:
    print("✓ AUTOMATIC INCIDENT CREATED SUCCESSFULLY!")
    print()
    print("STEP 3: Fetching incident details with AI context...")
    print("-" * 60)

    incident_response = requests.get(
        f"{BACKEND_URL}/api/incidents/{incident_id}",
        headers=HEADERS
    )

    if incident_response.status_code == 200:
        incident = incident_response.json()
        print(f"\nIncident: {incident['title']}")
        print(f"Severity: {incident['severity']}")
        print(f"Status: {incident['status']}")
        print(f"Symptoms: {incident['symptoms']}")

        if incident.get('deployment'):
            print(f"\n✓ Linked Deployment: {incident['deployment']['deployment_id']}")

        if incident.get('related_pr'):
            print(f"✓ Linked PR: PR #{incident['related_pr']['pr_id']}")
            print(f"  Author: {incident['related_pr']['author']}")

        if incident.get('coding_context'):
            ctx = incident['coding_context']
            print(f"\n✓ AI Session Context Available:")
            print(f"  Summary: {ctx['summary'][:80]}...")
            print(f"  Decisions: {len(ctx['decisions'])} logged")
            print(f"  Files changed: {len(ctx['files_changed'])}")
            print(f"  High-impact assumptions: {len(ctx['assumptions'])}")

    print()
    print("=" * 60)
    print("PIPELINE COMPLETE - FULLY AUTOMATIC!")
    print()
    print("What happened:")
    print("1. Deployment logged → Linked to PR #2 → Linked to AI session")
    print("2. Errors monitored → Threshold exceeded (3 errors)")
    print("3. Incident auto-created → Full context attached automatically")
    print("4. Ready for AI fix drafting with Gemini!")
    print()
    print(f"View in frontend: http://localhost:3000")
    print(f"Draft AI fix: curl -X POST {BACKEND_URL}/api/fix/draft \\")
    print(f"              -H 'Content-Type: application/json' \\")
    print(f"              -d '{{\"incident_id\": \"{incident_id}\"}}'")
else:
    print("⚠ No incident was auto-created (threshold not met)")
    print("Try running the script again or check backend logs")

print("=" * 60)
