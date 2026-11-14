from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

class OrderItemProposal(BaseModel):
    product_id: Optional[str] = None
    name: str
    quantity: float
    unit: str
    unit_price_zar: float
    total_zar: float

class OrderPreFlightRequest(BaseModel):
    spaza_id: str = "spaza_soweto_0042"
    supplier_id_or_address: str # ID or XRPL address
    category: str # e.g. "Spices & Seasoning"
    corridor: Optional[str] = "Kenya -> South Africa"
    items: List[OrderItemProposal]
    subtotal_zar: float
    fee_zar: float = 0.0
    total_zar: float
    raw_prompt_or_context: Optional[str] = None
    human_approval_token: Optional[str] = None

class GuardVoucher(BaseModel):
    voucher_id: str
    spaza_id: str
    supplier_address: str
    total_zar: float
    total_rlusd: float
    expires_at: datetime
    nonce: str
    signature: str # HMAC-SHA256 signature

class PreFlightCheckResponse(BaseModel):
    allowed: bool = Field(..., alias="allowed")
    status_code: str
    # Possible status_codes:
    # "APPROVED", "KILL_SWITCH_ACTIVE", "DAILY_BUDGET_EXCEEDED",
    # "SAFETY_RESERVE_BREACH", "SINGLE_TX_LIMIT_EXCEEDED",
    # "UNVETTED_SELLER", "UNVERIFIED_XRPL_SELLER", "CATEGORY_RULE_DISABLED",
    # "REQUIRES_HUMAN_APPROVAL", "DUPLICATE_ORDER_DETECTED",
    # "UNAUTHORIZED_CORRIDOR", "ADVERSARIAL_PAYLOAD_DETECTED"
    reason: str
    evaluated_category: Optional[str] = None
    rule_id: Optional[str] = None
    remaining_budget_zar: Optional[float] = None
    voucher: Optional[GuardVoucher] = None
    security_event_logged: bool = False

    model_config = ConfigDict(populate_by_name=True)
