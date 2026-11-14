from pydantic import BaseModel, ConfigDict
from datetime import datetime

class ProductBase(BaseModel):
    name: str
    category: str
    unit: str
    unit_price_zar: float
    unit_price_rlusd: float
    stock_quantity: int = 100
    in_stock: bool = True

class ProductCreate(ProductBase):
    supplier_id: str

class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    supplier_id: str
    created_at: datetime
    updated_at: datetime
