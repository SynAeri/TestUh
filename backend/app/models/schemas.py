# Data models and schemas for Nexus OS backend API
# Defines the Universal Schema (NexusObject) and all request/response models

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime
from uuid import UUID

class NexusMetadata(BaseModel):
    author: Optional[str] = None
    channel: Optional[str] = None
    page_no: Optional[int] = None
    url: Optional[str] = None

class NexusObject(BaseModel):
    id: UUID
    source_type: Literal["slack", "pdf", "video", "doc"]
    timestamp: datetime
    raw_content: str
    vector_embedding: Optional[List[float]] = None
    metadata: NexusMetadata

class QueryRequest(BaseModel):
    query: str
    limit: Optional[int] = Field(default=5, le=20)

class SourceCitation(BaseModel):
    id: UUID
    source_type: str
    snippet: str
    metadata: Dict[str, Any]
    relevance_score: float

class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]
    query: str

class IngestResponse(BaseModel):
    status: str
    files_processed: int
    objects_created: int
    message: str

class InsightData(BaseModel):
    metric: str
    value: Any
    description: str
    severity: Optional[Literal["info", "warning", "critical"]] = "info"

class InsightsResponse(BaseModel):
    insights: List[InsightData]
    generated_at: datetime

class SourceDetailResponse(BaseModel):
    id: UUID
    source_type: str
    timestamp: datetime
    raw_content: str
    metadata: Dict[str, Any]
