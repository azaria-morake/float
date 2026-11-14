from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db, Base, engine
from app.models import SpazaShop, Mandate, Supplier, Product, Order, XRPLTransaction, SimulationLog, AgentLog
from app.schemas import (
    SpazaShopResponse,
    MandateResponse,
    MandateUpdate,
    SupplierResponse,
    ProductResponse,
    OrderResponse,
    XRPLTransactionResponse,
    SimulationLogResponse,
    AgentLogResponse,
    OrderPreFlightRequest,
    PreFlightCheckResponse,
    GuardVoucher,
    EscrowCreateRequest,
    EscrowFinishRequest,
    PaymentChannelCreateRequest,
    AccountBalanceResponse,
    AgentReplenishRequest,
)
from app.services.guard import GuardEngine, verify_guard_voucher
from app.services.xrpl_service import xrpl_service
from app.services.orchestrator import agent_orchestrator
from app.services.logistics_agent import logistics_agent

# Auto-create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AfroSpaza Core API",
    description="Agentic B2B Marketplace & XRPL Settlement Backend for African Cross-Border Trade",
    version="0.1.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "healthy", "service": "afrospaza-core-backend", "version": "0.1.0"}

# 1. Spaza Profile
@app.get("/api/spaza", response_model=SpazaShopResponse)
def get_spaza(db: Session = Depends(get_db)):
    spaza = db.query(SpazaShop).first()
    if not spaza:
        raise HTTPException(status_code=404, detail="No spaza shop configured")
    return spaza

# 2. Mandate & Control Plane
@app.get("/api/mandate", response_model=MandateResponse)
def get_mandate(db: Session = Depends(get_db)):
    mandate = db.query(Mandate).first()
    if not mandate:
        raise HTTPException(status_code=404, detail="No active mandate configured")
    return mandate

@app.patch("/api/mandate", response_model=MandateResponse)
def update_mandate(payload: MandateUpdate, db: Session = Depends(get_db)):
    mandate = db.query(Mandate).first()
    if not mandate:
        raise HTTPException(status_code=404, detail="Mandate not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(mandate, key, value)

    db.commit()
    db.refresh(mandate)
    return mandate

# 3. Suppliers Catalog
@app.get("/api/suppliers", response_model=List[SupplierResponse])
def get_suppliers(db: Session = Depends(get_db)):
    return db.query(Supplier).all()

# 4. Products Catalog
@app.get("/api/products", response_model=List[ProductResponse])
def get_products(db: Session = Depends(get_db)):
    return db.query(Product).all()

# 5. Orders Ledger
@app.get("/api/orders", response_model=List[OrderResponse])
def get_orders(db: Session = Depends(get_db)):
    return db.query(Order).order_by(Order.created_at.desc()).all()

# 6. XRPL Transactions Ledger
@app.get("/api/xrpl/transactions", response_model=List[XRPLTransactionResponse])
def get_xrpl_transactions(db: Session = Depends(get_db)):
    return db.query(XRPLTransaction).order_by(XRPLTransaction.created_at.desc()).all()

# 7. Agent Activity Feed
@app.get("/api/agents/logs", response_model=List[AgentLogResponse])
def get_agent_logs(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(AgentLog).order_by(AgentLog.created_at.desc()).limit(limit).all()

# 8. Adversarial Defense Logs
@app.get("/api/simulations", response_model=List[SimulationLogResponse])
def get_simulation_logs(db: Session = Depends(get_db)):
    return db.query(SimulationLog).order_by(SimulationLog.created_at.desc()).all()

# 9. Guard Service Pre-Flight Checks & Voucher Verification
@app.post("/api/guard/pre-flight", response_model=PreFlightCheckResponse)
def guard_preflight_check(payload: OrderPreFlightRequest, db: Session = Depends(get_db)):
    """
    Deterministic rules-only Guard engine pre-flight semantic evaluation.
    Evaluates:
    - Emergency Kill Switch
    - Daily budget & safety reserve
    - Vetted supplier whitelist & XRPL trustline
    - Category single-order caps & double-approval mandates
    - Duplicate order prevention
    - Adversarial pattern filtering
    """
    result = GuardEngine.evaluate_preflight(db=db, request=payload)
    return result

@app.post("/api/guard/verify-voucher")
def guard_verify_voucher(voucher: GuardVoucher):
    """
    Cryptographic verification of an HMAC-SHA256 Guard voucher.
    Used by Treasury Agent before locking escrow or signing payment channel claim.
    """
    valid, message = verify_guard_voucher(voucher)
    return {"valid": valid, "message": message, "voucher_id": voucher.voucher_id}

# 10. XRPL Settlement Operations
@app.get("/api/xrpl/account/{address}", response_model=AccountBalanceResponse)
def get_xrpl_account(address: str):
    """Returns live on-chain balances, sequence, and trustlines from XRPL Testnet."""
    return xrpl_service.get_account_balances(address)

@app.post("/api/xrpl/escrow/create")
def create_escrow(payload: EscrowCreateRequest, db: Session = Depends(get_db)):
    """
    Creates an on-ledger Escrow on XRPL Testnet.
    Requires a valid Guard Voucher signed by the Guard Engine.
    """
    try:
        buyer_wallet = xrpl_service.get_or_fund_operator_wallet(payload.buyer_seed)
        res = xrpl_service.create_order_escrow(
            db=db,
            order_id=payload.order_id,
            voucher=payload.voucher,
            buyer_wallet=buyer_wallet,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/xrpl/escrow/finish")
def finish_escrow(payload: EscrowFinishRequest, db: Session = Depends(get_db)):
    """
    Releases funds from an XRPL Escrow to the seller upon delivery confirmation.
    """
    try:
        operator_wallet = xrpl_service.get_or_fund_operator_wallet(payload.operator_seed)
        res = xrpl_service.finish_order_escrow(
            db=db,
            order_id=payload.order_id,
            operator_wallet=operator_wallet,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/xrpl/channel/create")
def create_channel(payload: PaymentChannelCreateRequest):
    """
    Creates an on-chain XRPL Payment Channel establishing a hard spending ceiling.
    """
    try:
        buyer_wallet = xrpl_service.get_or_fund_operator_wallet(payload.buyer_seed)
        res = xrpl_service.create_payment_channel(
            buyer_wallet=buyer_wallet,
            destination_address=payload.destination_address,
            deposit_xrp=payload.deposit_xrp,
            settle_delay=payload.settle_delay,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# 11. Autonomous Agent Orchestration Endpoints
@app.post("/api/agents/replenish")
def trigger_agent_replenishment(payload: AgentReplenishRequest, db: Session = Depends(get_db)):
    """
    Triggers the full autonomous multi-agent replenishment loop:
    1. Agent 1 (Procurement): Sourcing with Groq (openai/gpt-oss-120b) + x402 API micropayments.
    2. Guard Service: Strict deterministic mandate check & cryptographic voucher issuance.
    3. Agent 2 (Treasury): Validates voucher and locks on-chain Escrow on XRPL Testnet.
    4. Agent 3 (Logistics): Dispatches air cargo tracking and verifies delivery check-in.
    """
    try:
        res = agent_orchestrator.run_replenishment_lifecycle(
            db=db,
            spaza_id=payload.spaza_id,
            item_keyword=payload.item_keyword,
            quantity=payload.quantity,
            unit=payload.unit,
            auto_deliver=payload.auto_deliver,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent orchestration failed: {str(e)}")

@app.post("/api/agents/deliver/{order_id}")
def trigger_agent_delivery(order_id: str, db: Session = Depends(get_db)):
    """
    Triggers Agent 3 (Logistics) to verify physical delivery arrival and execute XRPL EscrowFinish on-chain.
    """
    try:
        res = logistics_agent.confirm_delivery_and_release(
            db=db,
            order_id=order_id,
            inspector_name="Thandi Mokoena",
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Logistics release failed: {str(e)}")
