from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

def generate_uuid():
    return str(uuid.uuid4())

class Mandate(Base):
    __tablename__ = "mandates"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    spaza_id = Column(String(64), ForeignKey("spaza_shops.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    total_daily_budget_zar = Column(Float, default=5000.0, nullable=False)
    used_today_zar = Column(Float, default=0.0, nullable=False)
    currency = Column(String(16), default="RLUSD", nullable=False)
    exchange_rate_rlusd_to_zar = Column(Float, default=18.25, nullable=False)
    
    kill_switch_active = Column(Boolean, default=False, nullable=False)
    kill_switch_triggered_at = Column(DateTime, nullable=True)
    kill_switch_reason = Column(String(512), nullable=True)
    
    auto_rebalance_enabled = Column(Boolean, default=True, nullable=False)
    min_safety_reserve_zar = Column(Float, default=1000.0, nullable=False)
    
    # Privy Enclave Policy Link
    privy_policy_id = Column(String(128), nullable=True) # Linked Privy Policy ID
    
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    # Relationships
    spaza = relationship("SpazaShop", back_populates="mandate")
    rules = relationship("SpendingRule", back_populates="mandate", cascade="all, delete-orphan")


class SpendingRule(Base):
    __tablename__ = "spending_rules"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    mandate_id = Column(String(64), ForeignKey("mandates.id", ondelete="CASCADE"), nullable=False)
    
    category = Column(String(64), nullable=False) # e.g. "Spices & Dry Goods", "Maize & Grains"
    max_single_tx_zar = Column(Float, default=2500.0, nullable=False)
    daily_cap_zar = Column(Float, default=5000.0, nullable=False)
    
    # JSON list of vetted seller r-addresses or supplier IDs
    allowed_sellers = Column(JSON, default=list, nullable=False)
    
    requires_double_approval = Column(Boolean, default=False, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    # Relationships
    mandate = relationship("Mandate", back_populates="rules")

