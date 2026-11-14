from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class SpendingRuleBase(BaseModel):
    category: str
    max_single_tx_zar: float
    daily_cap_zar: float
    allowed_sellers: List[str] = []
    requires_double_approval: bool = False
    enabled: bool = True

class SpendingRuleCreate(SpendingRuleBase):
    pass

class SpendingRuleResponse(SpendingRuleBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    mandate_id: str
    created_at: datetime
    updated_at: datetime

class MandateBase(BaseModel):
    total_daily_budget_zar: float = 5000.0
    used_today_zar: float = 0.0
    currency: str = "RLUSD"
    exchange_rate_rlusd_to_zar: float = 18.25
    kill_switch_active: bool = False
    kill_switch_triggered_at: Optional[datetime] = None
    kill_switch_reason: Optional[str] = None
    auto_rebalance_enabled: bool = True
    min_safety_reserve_zar: float = 1000.0
    privy_policy_id: Optional[str] = None

class MandateUpdate(BaseModel):
    total_daily_budget_zar: Optional[float] = None
    used_today_zar: Optional[float] = None
    kill_switch_active: Optional[bool] = None
    kill_switch_reason: Optional[str] = None
    auto_rebalance_enabled: Optional[bool] = None
    min_safety_reserve_zar: Optional[float] = None
    privy_policy_id: Optional[str] = None

class MandateResponse(MandateBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    spaza_id: str
    rules: List[SpendingRuleResponse] = []
    created_at: datetime
    updated_at: datetime
