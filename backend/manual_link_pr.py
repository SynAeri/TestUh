#!/usr/bin/env python3
# Manually link PR #2 to existing session for testing
# Run this to simulate what the webhook would do

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# Update session repo name to match GitHub
print("Updating session repo name...")
result = supabase.table("ai_sessions").update({
    "repo": "SynAeri/Playcrowd"
}).eq("id", "sess_ca7180e0").execute()
print(f"✓ Updated session repo to SynAeri/Playcrowd")

# Add PR milestone
print("\nAdding PR milestone...")
result = supabase.table("ai_sessions").update({
    "pr_milestones": [{
        "pr_id": "2",
        "pr_title": "liminal web design",
        "pr_url": "https://github.com/SynAeri/Playcrowd/pull/2",
        "pr_author": "SynAeri",
        "created_at": "2024-03-22T03:00:00Z",
        "decision_count_at_pr": 2
    }],
    "pr_id": "2"
}).eq("id", "sess_ca7180e0").execute()
print(f"✓ Added PR #2 milestone to session")

# Mark decisions as before PR
print("\nMarking decisions as before PR...")
decisions = supabase.table("ai_decisions").select("*").eq("session_id", "sess_ca7180e0").execute()
for decision in decisions.data:
    supabase.table("ai_decisions").update({
        "pr_milestone": {
            "pr_id": "2",
            "created_before_pr": True,
            "pr_created_at": "2024-03-22T03:00:00Z"
        }
    }).eq("id", decision["id"]).execute()
print(f"✓ Marked {len(decisions.data)} decisions as before PR #2")

print("\n✅ Done! Session sess_ca7180e0 is now linked to PR #2")
print("\nVerify: curl 'https://unflattering-elinor-distinctively.ngrok-free.dev/sessions/sess_ca7180e0/pr-timeline'")
