from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class SpazaShop(Base):
    __tablename__ = "spaza_shops"

    id = Column(String(64), primary_key=True, index=True) # e.g. "spaza_soweto_0042" or UUID
    name = Column(String(128), nullable=False) # e.g. "Zuri Eats"
    owner_name = Column(String(128), nullable=False) # "Thandi Mokoena"
    owner_phone = Column(String(32), nullable=True)
    owner_email = Column(String(128), nullable=True, index=True)
    location = Column(String(256), nullable=False) # "Johannesburg, Gauteng"
    
    # Privy Integration
    privy_user_id = Column(String(128), nullable=True, index=True) # Privy DID (did:privy:...)
    
    # XRPL Account
    wallet_address = Column(String(64), nullable=True, index=True) # XRPL r-address
    
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    # Relationships
    mandate = relationship("Mandate", back_populates="spaza", uselist=False, cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="spaza", cascade="all, delete-orphan")

