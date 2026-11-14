from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class SupplierBase(BaseModel):
    name: str
    country: str = "Kenya"
    location: str
    wallet_address: str
    categories: List[str] = []
    rating: float = 5.0
    orders_fulfilled: int = 0
    delivery_time_est: str = "2-4 days"
    verified_xrpl: bool = True
    trustline_active: bool = True
    min_order_zar: float = 500.0

class SupplierCreate(SupplierBase):
    id: str

class SupplierResponse(SupplierBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
