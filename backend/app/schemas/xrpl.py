from pydantic import BaseModel, ConfigDict
from typing import Optional, Any
from datetime import datetime

class XRPLTransactionCreate(BaseModel):
    tx_hash: str
    order_id: Optional[str] = None
    tx_type: str
    sender_address: str
    destination_address: str
    amount: str
    currency: str = "RLUSD"
    fee_drops: str = "12"
    ledger_index: Optional[int] = None
    status: str = "PENDING"
    result_code: Optional[str] = None
    raw_meta: Optional[Any] = None

class XRPLTransactionResponse(XRPLTransactionCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
