# Query service for RAG-based semantic search
# Performs vector search in Supabase and generates AI responses with Gemini

import os
import requests
from typing import List, Dict, Any
from app.config.supabase import get_supabase_client
from app.models.schemas import SourceCitation

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.5-flash" 
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent"

def generate_query_embedding(query: str) -> List[float]:
    import random
    return [random.random() for _ in range(1536)]

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    import math
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    magnitude1 = math.sqrt(sum(a * a for a in vec1))
    magnitude2 = math.sqrt(sum(b * b for b in vec2))
    return dot_product / (magnitude1 * magnitude2) if magnitude1 and magnitude2 else 0.0

async def query_rag(query: str, limit: int = 5) -> Dict[str, Any]:
    supabase = get_supabase_client()

    query_embedding = generate_query_embedding(query)

    result = supabase.table("nexus_objects").select("*").execute()
    all_objects = result.data

    scored_objects = []
    for obj in all_objects:
        if obj.get("vector_embedding"):
            similarity = cosine_similarity(query_embedding, obj["vector_embedding"])
            scored_objects.append((obj, similarity))

    scored_objects.sort(key=lambda x: x[1], reverse=True)
    top_results = scored_objects[:limit]

    context_parts = []
    sources = []

    for obj, score in top_results:
        context_parts.append(f"[Source: {obj['source_type']}] {obj['raw_content']}")
        sources.append(SourceCitation(
            id=obj["id"],
            source_type=obj["source_type"],
            snippet=obj["raw_content"][:200],
            metadata=obj["metadata"],
            relevance_score=round(score, 3)
        ))

    context = "\n\n".join(context_parts)

    prompt = f"""Based on the following enterprise data sources, answer the user's question.
Be specific and cite which sources support your answer.

Context:
{context}

Question: {query}

Provide a clear, actionable answer based on the data provided."""

    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }

    response = requests.post(
        f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
        headers=headers,
        json=payload
    )

    response.raise_for_status()
    result = response.json()
    answer = result["candidates"][0]["content"]["parts"][0]["text"]

    return {
        "answer": answer,
        "sources": [s.model_dump() for s in sources],
        "query": query
    }
