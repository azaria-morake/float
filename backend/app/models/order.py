from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

def generate_uuid():
    return str(uuid.uuid4())

class Order(Base):
    __tablename__ = "orders"

    id = Column(String(64), primary_key=True, index=True) # e.g. "ORD-8921"
    spaza_id = Column(String(64), ForeignKey("spaza_shops.id", ondelete="CASCADE"), nullable=False)
    supplier_id = Column(String(64), ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False)
    
    # Status Lifecycle
    # PENDING_QUOTES -> GUARD_APPROVED -> ESCROW_LOCKED -> IN_TRANSIT -> DELIVERED -> SETTLED (or INTERCEPTED_REJECTED / CANCELLED)
    status = Column(String(32), default="PENDING_QUOTES", nullable=False, index=True)
    settlement_method = Column(String(32), default="ESCROW", nullable=False) # ESCROW, PAYMENT_CHANNEL, DIRECT_RLUSD
    
    subtotal_zar = Column(Float, nullable=False)
    fee_zar = Column(Float, default=0.0, nullable=False)
    total_zar = Column(Float, nullable=False)
    total_rlusd = Column(Float, nullable=False)
    
    # On-ledger settlement pointers
    xrpl_tx_hash = Column(String(128), nullable=True, index=True)
    escrow_sequence = Column(Integer, nullable=True)
    payment_channel_id = Column(String(128), nullable=True)
    fulfillment_hash = Column(String(128), nullable=True) # Preimage hash / crypto-condition
    cancel_after = Column(DateTime, nullable=True) # Escrow timeout expiry
    
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    delivered_at = Column(DateTime, nullable=True)
    settled_at = Column(DateTime, nullable=True)

    # Relationships
    spaza = relationship("SpazaShop", back_populates="orders")
    supplier = relationship("Supplier", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    xrpl_transactions = relationship("XRPLTransaction", back_populates="order")
    agent_logs = relationship("AgentLog", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    order_id = Column(String(64), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(64), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    
    name = Column(String(128), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(32), nullable=False)
    unit_price_zar = Column(Float, nullable=False)
    total_zar = Column(Float, nullable=False)

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

