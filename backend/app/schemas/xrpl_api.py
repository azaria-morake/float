from pydantic import BaseModel, ConfigDict
from typing import Optional
from app.schemas.guard import GuardVoucher

class EscrowCreateRequest(BaseModel):
    order_id: str
    voucher: GuardVoucher
    buyer_seed: Optional[str] = None # If None, uses operator/testnet wallet

class EscrowFinishRequest(BaseModel):
    order_id: str
    operator_seed: Optional[str] = None

class PaymentChannelCreateRequest(BaseModel):
    destination_address: str
    deposit_xrp: float = 50.0
    settle_delay: int = 86400
    buyer_seed: Optional[str] = None

class AccountBalanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    address: str
    xrp_balance: float
    rlusd_balance: float
    sequence: int
    owner_count: int
    exists_on_ledger: bool
    error: Optional[str] = None

