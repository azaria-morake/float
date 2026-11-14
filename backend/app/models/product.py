from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

def generate_uuid():
    return str(uuid.uuid4())

class Product(Base):
    __tablename__ = "products"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    supplier_id = Column(String(64), ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(128), nullable=False)
    category = Column(String(64), nullable=False) # e.g. "Spices", "Maize & Grains"
    unit = Column(String(32), nullable=False) # e.g. "kg", "bags (25kg)", "cases (12x1L)"
    
    unit_price_zar = Column(Float, nullable=False)
    unit_price_rlusd = Column(Float, nullable=False)
    stock_quantity = Column(Integer, default=100, nullable=False)
    in_stock = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    # Relationships
    supplier = relationship("Supplier", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")

