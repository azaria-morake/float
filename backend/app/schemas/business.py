from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class SpazaShopBase(BaseModel):
    name: str
    owner_name: str
    owner_phone: Optional[str] = None
    owner_email: Optional[str] = None
    location: str
    privy_user_id: Optional[str] = None
    wallet_address: Optional[str] = None

class SpazaShopCreate(SpazaShopBase):
    id: str

class SpazaShopResponse(SpazaShopBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime

