import pytest
from app.database import SessionLocal, Base, engine
from app.models import Order, AgentJob, AgentLog, X402Payment
from app.services.x402_service import x402_service
from app.services.procurement_agent import procurement_agent
from app.services.treasury_agent import treasury_agent
from app.services.logistics_agent import logistics_agent
from app.services.orchestrator import agent_orchestrator
from app.schemas.guard import GuardVoucher
from datetime import datetime, timezone, timedelta

def setup_module():
    Base.metadata.create_all(bind=engine)

def test_x402_micropayment():
    db = SessionLocal()
    try:
        res = x402_service.pay_for_quote_api(
            db=db,
            service_name="Nairobi-to-Joburg Cargo Quote API",
            service_url="https://api.kenya-consolidators.co.ke/v1/quote",
            amount_rlusd=0.05,
        )
        assert res["status"] == "SETTLED"
        assert res["amount_rlusd"] == 0.05
        assert res["facilitator"] == "t54"
        assert "X402_" in res["tx_hash"]

        # Check DB
        payment = db.query(X402Payment).filter(X402Payment.xrpl_tx_hash == res["tx_hash"]).first()
        assert payment is not None
        assert payment.amount_rlusd == 0.05
    finally:
        db.close()

def test_procurement_agent_groq_sourcing():
    db = SessionLocal()
    try:
        # Agent 1 sources Kenyan Pilipili using Groq (openai/gpt-oss-120b)
        proposal = procurement_agent.source_inventory(
            db=db,
            spaza_id="spaza_soweto_0042",
            item_keyword="Pilipili",
            target_quantity=2.0,
            unit="bag (5kg)",
        )

        assert proposal.spaza_id == "spaza_soweto_0042"
        assert len(proposal.items) == 1
        assert "Pilipili" in proposal.items[0].name
        assert proposal.total_zar > 0
        assert proposal.category == "Spices & Seasoning"

        # Check AgentJob was logged
        job = db.query(AgentJob).filter(AgentJob.agent_type == "PROCUREMENT").order_by(AgentJob.created_at.desc()).first()
        assert job is not None
        assert job.status == "COMPLETED"
    finally:
        db.close()

def test_treasury_rejects_missing_voucher():
    db = SessionLocal()
    try:
        # Fake voucher with expired time
        expired_voucher = GuardVoucher(
            voucher_id="vch_expired",
            spaza_id="spaza_soweto_0042",
            supplier_address="rDeKNqT4YQA17ubH5ei88auN7iB5i6sAie",
            total_zar=1000.0,
            total_rlusd=54.79,
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=5), # Expired!
            nonce="nonce_test",
            signature="sig_test",
        )

        with pytest.raises(ValueError) as excinfo:
            treasury_agent.execute_settlement(
                db=db,
                order_id="ORD-8921",
                voucher=expired_voucher,
            )
        assert "Invalid Guard Voucher" in str(excinfo.value)
    finally:
        db.close()

def test_logistics_dispatch():
    db = SessionLocal()
    try:
        res = logistics_agent.dispatch_and_track(
            db=db,
            order_id="ORD-8921",
        )
        assert res["status"] == "IN_TRANSIT"
        assert "CARGO-KE-ZA-" in res["tracking_id"]
    finally:
        db.close()

def test_full_replenishment_lifecycle_end_to_end():
    db = SessionLocal()
    try:
        # Run full multi-agent cycle:
        # Groq Sourcing + x402 Micropayment -> Guard Voucher -> XRPL Escrow -> Logistics Dispatch
        result = agent_orchestrator.run_replenishment_lifecycle(
            db=db,
            spaza_id="spaza_soweto_0042",
            item_keyword="Bird's Eye Chili",
            quantity=3.0,
            unit="pack (1kg)",
            auto_deliver=False,
        )

        assert result["guard_status_code"] == "APPROVED"
        assert result["status"] == "IN_TRANSIT"
        assert len(result["xrpl_escrow_tx_hash"]) == 64
        assert result["xrpl_escrow_sequence"] is not None
        assert "CARGO-KE-ZA-" in result["tracking_id"]

        # Verify order in DB
        order = db.query(Order).filter(Order.id == result["order_id"]).first()
        assert order is not None
        assert order.status == "IN_TRANSIT"
        assert order.xrpl_tx_hash == result["xrpl_escrow_tx_hash"]
    finally:
        db.close()
