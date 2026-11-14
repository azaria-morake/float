from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

def generate_uuid():
    return str(uuid.uuid4())

class XRPLTransaction(Base):
    __tablename__ = "xrpl_transactions"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    tx_hash = Column(String(128), unique=True, index=True, nullable=False)
    order_id = Column(String(64), ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    
    # XRPL transaction type
    tx_type = Column(String(64), nullable=False) # Payment, EscrowCreate, EscrowFinish, EscrowCancel, PaymentChannelCreate, PaymentChannelClaim, TrustSet
    sender_address = Column(String(64), nullable=False, index=True)
    destination_address = Column(String(64), nullable=False, index=True)
    
    amount = Column(String(64), nullable=False)
    currency = Column(String(16), default="RLUSD", nullable=False) # RLUSD, XRP
    fee_drops = Column(String(32), default="12", nullable=False)
    
    ledger_index = Column(Integer, nullable=True)
    status = Column(String(32), default="PENDING", nullable=False) # PENDING, VALIDATED, FAILED
    result_code = Column(String(64), nullable=True) # tesSUCCESS, tec..., tem...
    raw_meta = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=utcnow, nullable=False)

    # Relationships
    order = relationship("Order", back_populates="xrpl_transactions")

