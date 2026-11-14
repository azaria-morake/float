from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

def generate_uuid():
    return str(uuid.uuid4())

class AgentJob(Base):
    __tablename__ = "agent_jobs"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    agent_type = Column(String(32), nullable=False, index=True) # PROCUREMENT, TREASURY, LOGISTICS, GUARD
    task_name = Column(String(128), nullable=False)
    
    payload = Column(JSON, default=dict, nullable=False)
    status = Column(String(32), default="QUEUED", nullable=False, index=True) # QUEUED, RUNNING, COMPLETED, FAILED, INTERCEPTED
    result = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    # Relationships
    logs = relationship("AgentLog", back_populates="job", cascade="all, delete-orphan")


class AgentLog(Base):
    __tablename__ = "agent_logs"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    job_id = Column(String(64), ForeignKey("agent_jobs.id", ondelete="SET NULL"), nullable=True)
    order_id = Column(String(64), ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    
    agent_type = Column(String(32), nullable=False, index=True) # PROCUREMENT, TREASURY, LOGISTICS, GUARD
    level = Column(String(16), default="INFO", nullable=False) # INFO, WARN, ERROR, SUCCESS, SECURITY
    message = Column(Text, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=utcnow, nullable=False, index=True)

    # Relationships
    job = relationship("AgentJob", back_populates="logs")
    order = relationship("Order", back_populates="agent_logs")

