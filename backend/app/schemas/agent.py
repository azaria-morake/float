from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime

class AgentJobBase(BaseModel):
    agent_type: str
    task_name: str
    payload: Dict[str, Any] = {}
    status: str = "QUEUED"
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

class AgentJobResponse(AgentJobBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime

class AgentLogCreate(BaseModel):
    job_id: Optional[str] = None
    order_id: Optional[str] = None
    agent_type: str
    level: str = "INFO"
    message: str
    metadata_json: Optional[Dict[str, Any]] = None

class AgentLogResponse(AgentLogCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime

class AgentReplenishRequest(BaseModel):
    spaza_id: str = "spaza_soweto_0042"
    item_keyword: str = "Pilipili"
    quantity: float = 2.0
    unit: str = "bag (5kg)"
    auto_deliver: bool = False

