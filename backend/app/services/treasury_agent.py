import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from xrpl.wallet import Wallet

from app.models import Order, OrderItem, AgentLog, AgentJob, SpazaShop, Supplier
from app.schemas.guard import GuardVoucher
from app.services.xrpl_service import xrpl_service
from app.services.guard import verify_guard_voucher

logger = logging.getLogger(__name__)

def utcnow():
    return datetime.now(timezone.utc)

class TreasuryAgent:
    """
    Agent 2 — Treasury / Settlement Agent:
    - Receives Guard-cleared purchase proposals with signed GuardVoucher
    - Strictly verifies cryptographic voucher before touching the ledger
    - Executes on-chain EscrowCreate on XRPL Testnet
    - Records verified transaction hashes to the order ledger
    - Separation of duties: CANNOT select suppliers, and CANNOT release escrow without Logistics delivery proof.
    """

    def execute_settlement(
        self,
        db: Session,
        order_id: str,
        voucher: GuardVoucher,
        buyer_wallet: Optional[Wallet] = None,
        operator_seed: Optional[str] = None,
    ) -> Dict[str, Any]:
        now = utcnow()

        # 1. Job entry
        job = AgentJob(
            agent_type="TREASURY",
            task_name="EXECUTE_ESCROW_LOCK",
            payload={"order_id": order_id, "voucher_id": voucher.voucher_id, "total_zar": voucher.total_zar},
            status="RUNNING",
            created_at=now,
        )
        db.add(job)
        db.commit()

        self._log(db, job.id, order_id, "INFO", f"Treasury Agent activated: Verifying Guard Voucher {voucher.voucher_id} for Order {order_id}.")

        # 2. Cryptographic Voucher Verification
        valid, msg = verify_guard_voucher(voucher)
        if not valid:
            reason = f"Treasury BLOCKED on-chain execution: Invalid Guard Voucher ({msg})."
            job.status = "INTERCEPTED"
            job.error_message = reason
            self._log(db, job.id, order_id, "SECURITY", reason, {"voucher": voucher.model_dump(mode="json")})
            db.commit()
            raise ValueError(reason)

        self._log(db, job.id, order_id, "SUCCESS", f"Guard Voucher cryptographic signature VALIDATED. Preparing XRPL EscrowCreate for R{voucher.total_zar:.2f}.")

        # 3. Get or fund buyer wallet on XRPL Testnet
        wallet = buyer_wallet or xrpl_service.get_or_fund_operator_wallet(operator_seed)

        # 4. Execute on-ledger EscrowCreate via XRPLService
        settlement_res = xrpl_service.create_order_escrow(
            db=db,
            order_id=order_id,
            voucher=voucher,
            buyer_wallet=wallet,
            delay_seconds=60,
            cancel_days=7,
        )

        job.status = "COMPLETED"
        job.result = settlement_res
        db.commit()

        self._log(
            db,
            job.id,
            order_id,
            "SUCCESS",
            f"XRPL on-chain Escrow LOCKED: Hash {settlement_res['tx_hash']} (Seq: {settlement_res['escrow_sequence']}). Funds secured on ledger.",
            settlement_res
        )

        return settlement_res

    def _log(self, db: Session, job_id: str, order_id: Optional[str], level: str, message: str, meta: Optional[dict] = None):
        log_entry = AgentLog(
            job_id=job_id,
            order_id=order_id,
            agent_type="TREASURY",
            level=level,
            message=message,
            metadata_json=meta,
            created_at=utcnow(),
        )
        db.add(log_entry)
        db.commit()

treasury_agent = TreasuryAgent()
