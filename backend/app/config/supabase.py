# Supabase client configuration for Nexus OS
# Lazy initialization to avoid import-time errors when .env is missing

import os
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Client:
    global _supabase_client

    if _supabase_client is None:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")

        if not supabase_url or not supabase_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_KEY must be set in environment variables. "
                "Create a .env file with these values."
            )

        _supabase_client = create_client(supabase_url, supabase_key)

    return _supabase_client
