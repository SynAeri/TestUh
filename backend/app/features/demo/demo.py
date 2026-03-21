# Demo packet API route for bootstrapping frontend with golden road data
# Connects to GET /api/demo/packet endpoint

from fastapi import APIRouter
from app.models.schemas import DemoPacket
from app.shared.data.seed import get_demo_packet

router = APIRouter(prefix="/api/demo", tags=["demo"])

@router.get("/packet", response_model=DemoPacket)
async def get_demo_data():
    """
    Returns the complete seeded demo dataset for the golden road.
    Includes: coding context, PR, deployment, ticket, and incident.
    Frontend can use this to bootstrap the entire demo scenario in one call.
    """
    packet = get_demo_packet()
    return packet


@router.post("/reset")
async def reset_demo_data():
    """
    Resets the demo data back to initial seed state.
    Useful for demo resets during presentations.
    """
    from app.shared.data.seed import seed_golden_road_data
    from app.shared.data.store import store

    store.clear_all()
    packet = seed_golden_road_data()

    return {
        "status": "reset_complete",
        "message": "Demo data has been reset to initial golden road scenario",
        "incident_id": packet.incident.incident_id
    }
