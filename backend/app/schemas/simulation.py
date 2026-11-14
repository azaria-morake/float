from pydantic import BaseModel, ConfigDict
from typing import List
from datetime import datetime

class SimulationLogCreate(BaseModel):
    attack_type: str
    payload_summary: str
    intercepted: bool = True
    intercepting_layer: str
    reason: str
    action_taken: str = "BLOCKED"
    logs: List[str] = []

class SimulationLogResponse(SimulationLogCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
