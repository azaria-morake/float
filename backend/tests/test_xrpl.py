import pytest
from datetime import datetime, timezone, timedelta
from app.database import SessionLocal, Base, engine
from app.models import Order, XRPLTransaction, SpazaShop, Supplier
from app.services.xrpl_service import xrpl_service
from app.services.guard import generate_guard_voucher
from app.schemas.guard import GuardVoucher
from xrpl.wallet import Wallet

def setup_module():
    Base.metadata.create_all(bind=engine)

def test_xrpl_account_balances():
    # Query a known active testnet account
    data = xrpl_service.get_account_balances("rLsNM7Bw7SoibQrmosxdUyNYuA6EdCTYfu")
    assert data["exists_on_ledger"] is True
    assert data["xrp_balance"] > 0
    assert "sequence" in data

def test_escrow_creation_rejects_invalid_voucher():
    db = SessionLocal()
    try:
        # Create a fake tampered voucher with invalid HMAC signature
        fake_voucher = GuardVoucher(
            voucher_id="vch_fake_9999",
            spaza_id="spaza_soweto_0042",
            supplier_address="rDeKNqT4YQA17ubH5ei88auN7iB5i6sAie",
            total_zar=1500.0,
            total_rlusd=82.19,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            nonce="nonce_fake",
            signature="deadbeef0000111122223333444455556666777788889999aaaabbbbccccdddd",
        )
        wallet = Wallet.from_seed("sEd7rb17kYn1g4GY8D95DBpHW8iV1ui")

        with pytest.raises(ValueError) as excinfo:
            xrpl_service.create_order_escrow(
                db=db,
                order_id="ORD-8921",
                voucher=fake_voucher,
                buyer_wallet=wallet,
            )
        assert "Guard Voucher invalid" in str(excinfo.value)
    finally:
        db.close()

def test_escrow_create_live_testnet():
    db = SessionLocal()
    try:
        # Generate and fund fresh testnet buyer and seller wallets
        buyer_wallet = xrpl_service.get_or_fund_operator_wallet()
        seller_wallet = xrpl_service.get_or_fund_operator_wallet()
        seller_address = seller_wallet.classic_address

        # Generate a legitimate Guard voucher
        voucher = generate_guard_voucher(
            spaza_id="spaza_soweto_0042",
            supplier_address=seller_address,
            total_zar=500.0,
            total_rlusd=27.40,
        )

        res = xrpl_service.create_order_escrow(
            db=db,
            order_id="ORD-8921",
            voucher=voucher,
            buyer_wallet=buyer_wallet,
            delay_seconds=60,
            cancel_days=2,
        )

        assert res["result_code"] == "tesSUCCESS"
        assert len(res["tx_hash"]) == 64
        assert res["status"] == "ESCROW_LOCKED"

        # Verify DB updated
        order = db.query(Order).filter(Order.id == "ORD-8921").first()
        assert order.status == "ESCROW_LOCKED"
        assert order.xrpl_tx_hash == res["tx_hash"]
        assert order.escrow_sequence == res["escrow_sequence"]

        # Verify XRPLTransaction record
        tx_rec = db.query(XRPLTransaction).filter(XRPLTransaction.tx_hash == res["tx_hash"]).first()
        assert tx_rec is not None
        assert tx_rec.tx_type == "EscrowCreate"
        assert tx_rec.status == "VALIDATED"
    finally:
        db.close()
