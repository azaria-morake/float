from sqlalchemy import Column, String, Float, DateTime
from datetime import datetime, timezone
import uuid
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

def generate_uuid():
    return str(uuid.uuid4())

class X402Payment(Base):
    __tablename__ = "x402_payments"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    agent_type = Column(String(32), default="PROCUREMENT", nullable=False)
    
    service_url = Column(String(256), nullable=False)
    service_name = Column(String(128), nullable=False) # e.g. "Nairobi Courier Quote API"
    amount_rlusd = Column(Float, nullable=False) # e.g. 0.05 RLUSD
    
    xrpl_tx_hash = Column(String(128), nullable=True, index=True)
    facilitator = Column(String(64), default="t54", nullable=False)
    status = Column(String(32), default="PENDING", nullable=False) # PENDING, SETTLED, FAILED
    
    created_at = Column(DateTime, default=utcnow, nullable=False)

