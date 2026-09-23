from typing import Literal

from pydantic import BaseModel, Field


AgentName = Literal["finance", "operations", "sales", "research", "general"]


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: str | None = None


class AgentResponse(BaseModel):
    agent: AgentName
    answer: str
    next_steps: list[str] = []
    sources: list[str] = []
    demo_mode: bool


class HealthResponse(BaseModel):
    status: str
    demo_mode: bool
    configured_agents: list[str]
