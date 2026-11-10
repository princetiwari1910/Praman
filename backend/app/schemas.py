from __future__ import annotations

from pydantic import BaseModel, Field


# --- Request/Response Schemas matching the API contract ---

class AddressChain(BaseModel):
    address: str = Field(description="Wallet address (0x-prefixed hex string)")
    chain: str = Field(description="Blockchain name")


class ReasonsItem(BaseModel):
    code: str = Field(description="Reason code")
    title: str = Field(description="Reason title")
    weight: int = Field(description="Weight value")
    detail: str = Field(description="Human-readable detail")


class NodeItem(BaseModel):
    id: str = Field(description="Node ID")
    label: str = Field(description="Node label")
    risk: str = Field(description="Risk band (low|medium|high|severe)")


class EdgeItem(BaseModel):
    source: str = Field(description="Source node ID")
    target: str = Field(description="Target node ID")
    value: float = Field(description="Edge value")


class RiskGraph(BaseModel):
    nodes: list[NodeItem] = Field(default_factory=list, description="Graph nodes")
    edges: list[EdgeItem] = Field(default_factory=list, description="Graph edges")


class BaseRiskResponse(BaseModel):
    address: str
    chain: str
    score: int = Field(description="Risk score 0-100")
    band: str = Field(description="Risk band: low|medium|high|severe")
    sanctions_hit: bool
    reasons: list[ReasonsItem] = Field(default_factory=list, description="Risk reasons")
    graph: RiskGraph
    generated_at: str = Field(description="ISO-8601 timestamp")
    data_mode: str = Field(description="'fixture'|'live'")


class BaseReportPayload(BaseModel):
    address: str = Field(description="Wallet address")
    chain: str = Field(description="Blockchain name")


class BaseReportResponse(BaseModel):
    report_id: str = Field(description="Report identifier")


class BaseFeedbackPayload(BaseModel):
    address: str = Field(description="Wallet address")
    verdict: str = Field(description="Verdict: low|medium|high|severe")