# Source service for retrieving individual document details
# Provides the lineage and trust view showing raw content and metadata

from typing import Optional, Dict, Any
from uuid import UUID
from app.config.supabase import get_supabase_client

async def get_source_by_id(source_id: str) -> Optional[Dict[str, Any]]:
    supabase = get_supabase_client()

    result = supabase.table("nexus_objects").select("*").eq("id", source_id).execute()

    if not result.data or len(result.data) == 0:
        return None

    obj = result.data[0]

    return {
        "id": obj["id"],
        "source_type": obj["source_type"],
        "timestamp": obj["timestamp"],
        "raw_content": obj["raw_content"],
        "metadata": obj["metadata"]
    }
