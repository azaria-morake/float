from sqlalchemy import Column, String, Boolean, DateTime, JSON, Text
from datetime import datetime, timezone
import uuid
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

def generate_uuid():
    return str(uuid.uuid4())

class SimulationLog(Base):
    __tablename__ = "simulation_logs"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    attack_type = Column(String(64), nullable=False, index=True) # PROMPT_INJECTION, OVERSPEND_EXPLOIT, UNVETTED_SELLER, DOUBLE_SETTLEMENT, REPLAY_ESCROW
    payload_summary = Column(Text, nullable=False)
    
    intercepted = Column(Boolean, default=True, nullable=False)
    intercepting_layer = Column(String(64), nullable=False) # GUARD, PRIVY_POLICY, XRPL_LEDGER, ESCROW_CONDITION
    reason = Column(Text, nullable=False)
    action_taken = Column(String(32), default="BLOCKED", nullable=False) # BLOCKED, QUARANTINED, ALERT_SENT
    
    logs = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

