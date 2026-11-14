from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String(64), primary_key=True, index=True) # e.g. "sup_nairobi_spices_01"
    name = Column(String(128), nullable=False)
    country = Column(String(64), default="Kenya", nullable=False) # "Kenya" or "South Africa"
    location = Column(String(256), nullable=False)
    wallet_address = Column(String(64), nullable=False, index=True) # XRPL r-address
    categories = Column(JSON, default=list, nullable=False) # ["Spices", "Chili", "Dry Goods"]
    
    rating = Column(Float, default=5.0, nullable=False)
    orders_fulfilled = Column(Integer, default=0, nullable=False)
    delivery_time_est = Column(String(64), default="2-4 days", nullable=False)
    verified_xrpl = Column(Boolean, default=True, nullable=False)
    trustline_active = Column(Boolean, default=True, nullable=False)
    min_order_zar = Column(Float, default=500.0, nullable=False)
    
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    # Relationships
    products = relationship("Product", back_populates="supplier", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="supplier")

