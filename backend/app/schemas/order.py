from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class OrderItemBase(BaseModel):
    name: str
    quantity: float
    unit: str
    unit_price_zar: float
    total_zar: float
    product_id: Optional[str] = None

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemResponse(OrderItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    order_id: str

class OrderBase(BaseModel):
    spaza_id: str
    supplier_id: str
    status: str = "PENDING_QUOTES"
    settlement_method: str = "ESCROW"
    subtotal_zar: float
    fee_zar: float = 0.0
    total_zar: float
    total_rlusd: float
    xrpl_tx_hash: Optional[str] = None
    escrow_sequence: Optional[int] = None
    payment_channel_id: Optional[str] = None
    fulfillment_hash: Optional[str] = None
    cancel_after: Optional[datetime] = None
    notes: Optional[str] = None

class OrderCreate(OrderBase):
    id: str
    items: List[OrderItemCreate] = []

class OrderResponse(OrderBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    items: List[OrderItemResponse] = []
    created_at: datetime
    updated_at: datetime
    delivered_at: Optional[datetime] = None
    settled_at: Optional[datetime] = None
