# Seed data for the golden road demo
# Pre-populated scenario: a payment processing bug that was introduced in a recent PR

from datetime import datetime, timedelta
from app.models.schemas import (
    CodingContextSummary, PRMock, DeploymentRecord,
    TicketMock, IncidentDetail, DemoPacket
)
from app.shared.data.store import store

def seed_golden_road_data() -> DemoPacket:
    """
    Seeds the data store with a complete golden road scenario.

    Scenario: Payment processing timeout bug
    - Developer added async payment processing feature
    - Made assumptions about timeout handling
    - Deployed to production
    - Production incident occurred: payments failing
    - AI context helps identify the issue quickly
    """

    # Create coding context from a Claude session
    context = CodingContextSummary(
        summary="Implemented async payment processing with Stripe webhook integration to improve checkout performance",
        decisions=[
            "Used async/await pattern for Stripe API calls",
            "Added webhook endpoint for payment confirmation",
            "Set default timeout to 5 seconds to prevent hanging requests",
            "Implemented retry logic with exponential backoff"
        ],
        assumptions=[
            "Stripe webhooks will arrive within 5 seconds",
            "Network latency between Stripe and our servers is minimal",
            "Existing error handling will catch timeout exceptions",
            "Payment confirmations don't need manual reconciliation"
        ],
        files_changed=[
            "src/payments/stripe_client.py",
            "src/api/checkout_endpoint.py",
            "src/webhooks/stripe_handler.py",
            "tests/test_payment_flow.py"
        ],
        linked_pr_id="PR-1247",
        linked_ticket_id="TICKET-892",
        linked_deployment_id="deploy-prod-20260321-1530",
        intended_outcome="Reduce checkout page load time by processing payments asynchronously",
        session_timestamp=datetime.utcnow() - timedelta(hours=6)
    )

    # Create related PR
    pr = PRMock(
        pr_id="PR-1247",
        title="feat: Add async payment processing with Stripe webhooks",
        description="Implements async payment flow to improve UX. Payments now process in background with webhook confirmation.",
        author="jordan@company.com",
        commit_sha="a7f3d2e",
        files_changed=context.files_changed,
        status="merged",
        created_at=datetime.utcnow() - timedelta(hours=8),
        merged_at=datetime.utcnow() - timedelta(hours=6)
    )

    # Create deployment record
    deployment = DeploymentRecord(
        deployment_id="deploy-prod-20260321-1530",
        commit_sha="a7f3d2e",
        environment="production",
        service_name="payment-service",
        timestamp=datetime.utcnow() - timedelta(hours=3),
        status="success",
        deployed_by="jordan@company.com"
    )

    # Create related ticket
    ticket = TicketMock(
        ticket_id="TICKET-892",
        title="Improve checkout performance",
        description="Users complaining about slow checkout. Need to optimize payment processing flow.",
        assignee="jordan@company.com",
        status="closed",
        priority="high",
        created_at=datetime.utcnow() - timedelta(days=2)
    )

    # Create incident (triggered in production)
    incident = IncidentDetail(
        incident_id="INC-2026-03-21-001",
        title="Payment processing failures - timeouts on checkout",
        symptoms="Multiple customer reports of failed payments. Error logs show timeout exceptions after 5 seconds. Approximately 30% of payment attempts failing.",
        impacted_service="payment-service",
        severity="critical",
        status="open",
        created_at=datetime.utcnow() - timedelta(minutes=15),
        deployment=deployment,
        related_pr=pr,
        related_ticket=ticket,
        coding_context=context
    )

    # Save all to store
    store.save_context("context-1", context)
    store.save_pr(pr)
    store.save_deployment(deployment)
    store.save_ticket(ticket)
    store.save_incident(incident)

    # Return complete packet
    return DemoPacket(
        coding_context=context,
        pr=pr,
        deployment=deployment,
        ticket=ticket,
        incident=incident,
        metadata={
            "scenario": "payment_timeout_bug",
            "golden_road": True,
            "seeded_at": datetime.utcnow().isoformat()
        }
    )


def get_demo_packet() -> DemoPacket:
    """
    Returns the seeded demo packet.
    If data doesn't exist in store, seeds it first.
    """
    # Check if data exists
    incident = store.get_incident("INC-2026-03-21-001")

    if incident is None:
        # Seed the data
        return seed_golden_road_data()

    # Return existing data
    context = store.get_context("context-1")
    pr = store.get_pr("PR-1247")
    deployment = store.get_deployment("deploy-prod-20260321-1530")
    ticket = store.get_ticket("TICKET-892")

    return DemoPacket(
        coding_context=context,
        pr=pr,
        deployment=deployment,
        ticket=ticket,
        incident=incident,
        metadata={
            "scenario": "payment_timeout_bug",
            "golden_road": True
        }
    )
