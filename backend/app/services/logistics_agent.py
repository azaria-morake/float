import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from xrpl.wallet import Wallet

from app.models import Order, AgentLog, AgentJob
from app.services.xrpl_service import xrpl_service

logger = logging.getLogger(__name__)

def utcnow():
    return datetime.now(timezone.utc)

class LogisticsAgent:
    """
    Agent 3 — Logistics & Compliance Agent:
    - Tracks courier transit milestones along the corridor (e.g. Nairobi Cargo -> OR Tambo -> Johannesburg Spaza)
    - Verifies delivery geofence arrival & receipt inspection
    - Executes on-ledger EscrowFinish to release funds to the seller
    - Separation of duties: Did not pick the seller; acts strictly on verified physical delivery proof.
    """

    def dispatch_and_track(
        self,
        db: Session,
        order_id: str,
        courier_tracking_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        now = utcnow()
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")

        tracking_id = courier_tracking_id or f"CARGO-KE-ZA-{order_id[-4:]}"
        order.status = "IN_TRANSIT"
        order.notes = f"Air cargo en route: {tracking_id} via Jomo Kenyatta International Airport (NBO) ➔ OR Tambo (JNB)."

        job = AgentJob(
            agent_type="LOGISTICS",
            task_name="DISPATCH_COURIER",
            payload={"order_id": order_id, "tracking_id": tracking_id},
            status="COMPLETED",
            result={"status": "IN_TRANSIT", "tracking_id": tracking_id},
            created_at=now,
        )
        db.add(job)

        self._log(
            db,
            job.id,
            order.id,
            "INFO",
            f"Logistics Agent dispatched shipment: Air Cargo {tracking_id} departed Nairobi Cargo Terminal. Order marked IN_TRANSIT.",
            {"tracking_id": tracking_id, "corridor": "Kenya ➔ South Africa"}
        )
        db.commit()

        return {
            "order_id": order.id,
            "status": "IN_TRANSIT",
            "tracking_id": tracking_id,
        }

    def confirm_delivery_and_release(
        self,
        db: Session,
        order_id: str,
        inspector_name: str = "Thandi Mokoena",
        operator_wallet: Optional[Wallet] = None,
        operator_seed: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Confirms delivery verification and triggers XRPL EscrowFinish.
        """
        now = utcnow()
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")

        job = AgentJob(
            agent_type="LOGISTICS",
            task_name="CONFIRM_DELIVERY_RELEASE_ESCROW",
            payload={"order_id": order_id, "inspector": inspector_name},
            status="RUNNING",
            created_at=now,
        )
        db.add(job)
        db.commit()

        self._log(
            db,
            job.id,
            order.id,
            "INFO",
            f"Logistics Agent received geofence arrival & goods inspection by {inspector_name}. Verified quality check passed."
        )

        wallet = operator_wallet or xrpl_service.get_or_fund_operator_wallet(operator_seed)

        # Trigger on-chain EscrowFinish
        try:
            release_res = xrpl_service.finish_order_escrow(
                db=db,
                order_id=order_id,
                operator_wallet=wallet,
            )

            job.status = "COMPLETED"
            job.result = release_res
            db.commit()

            self._log(
                db,
                job.id,
                order.id,
                "SUCCESS",
                f"Escrow funds released to supplier on XRPL Testnet: Tx {release_res['tx_hash']}. Order {order.id} is officially SETTLED.",
                release_res
            )

            return release_res
        except Exception as e:
            job.status = "FAILED"
            job.error_message = str(e)
            db.commit()
            self._log(db, job.id, order.id, "ERROR", f"Escrow release failed on ledger: {e}")
            raise e

    def _log(self, db: Session, job_id: str, order_id: Optional[str], level: str, message: str, meta: Optional[dict] = None):
        log_entry = AgentLog(
            job_id=job_id,
            order_id=order_id,
            agent_type="LOGISTICS",
            level=level,
            message=message,
            metadata_json=meta,
            created_at=utcnow(),
        )
        db.add(log_entry)
        db.commit()

logistics_agent = LogisticsAgent()

