import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models import Order, OrderItem, SpazaShop, Supplier, AgentLog
from app.services.procurement_agent import procurement_agent
from app.services.guard import GuardEngine
from app.services.treasury_agent import treasury_agent
from app.services.logistics_agent import logistics_agent

logger = logging.getLogger(__name__)

def utcnow():
    return datetime.now(timezone.utc)

class AgentOrchestrator:
    """
    Master Agent Orchestration Engine.
    Coordinates the Three Agents and the Guard across the cross-border trade lifecycle:
    1. Agent 1 (Procurement): Sourcing + x402 API micropayments (Groq openai/gpt-oss-120b)
    2. Guard Service: Strict deterministic pre-flight mandate evaluation & voucher minting
    3. Agent 2 (Treasury): On-chain EscrowCreate execution on XRPL Testnet
    4. Agent 3 (Logistics): Air cargo tracking & delivery-triggered EscrowFinish
    """

    def run_replenishment_lifecycle(
        self,
        db: Session,
        spaza_id: str = "spaza_soweto_0042",
        item_keyword: str = "Pilipili",
        quantity: float = 2.0,
        unit: str = "bag (5kg)",
        auto_deliver: bool = False,
    ) -> Dict[str, Any]:
        now = utcnow()
        lifecycle_id = f"CYCLE-{uuid.uuid4().hex[:8].upper()}"
        order_id = f"ORD-{uuid.uuid4().hex[:6].upper()}"

        # -------------------------------------------------------------
        # STEP 1: Agent 1 (Procurement) Sources & Pays x402 Micropayment
        # -------------------------------------------------------------
        proposal = procurement_agent.source_inventory(
            db=db,
            spaza_id=spaza_id,
            item_keyword=item_keyword,
            target_quantity=quantity,
            unit=unit,
        )

        # -------------------------------------------------------------
        # STEP 2: The Guard Evaluates Mandate Rules (Zero-LLM Filter)
        # -------------------------------------------------------------
        guard_result = GuardEngine.evaluate_preflight(db=db, request=proposal)

        if not guard_result.allowed:
            return {
                "lifecycle_id": lifecycle_id,
                "order_id": order_id,
                "status": "GUARD_INTERCEPTED",
                "guard_status_code": guard_result.status_code,
                "reason": guard_result.reason,
                "proposal": proposal.model_dump(),
                "voucher": None,
                "xrpl_tx_hash": None,
            }

        voucher = guard_result.voucher

        # -------------------------------------------------------------
        # STEP 3: Record Order in Database
        # -------------------------------------------------------------
        supplier = db.query(Supplier).filter(
            (Supplier.id == proposal.supplier_id_or_address) |
            (Supplier.wallet_address == proposal.supplier_id_or_address)
        ).first()

        order = Order(
            id=order_id,
            spaza_id=spaza_id,
            supplier_id=supplier.id if supplier else "sup_nairobi_spices",
            status="GUARD_APPROVED",
            settlement_method="ESCROW",
            subtotal_zar=proposal.subtotal_zar,
            fee_zar=proposal.fee_zar,
            total_zar=proposal.total_zar,
            total_rlusd=voucher.total_rlusd,
            notes=proposal.raw_prompt_or_context,
            created_at=now,
        )
        db.add(order)
        db.flush()

        for itm in proposal.items:
            order_item = OrderItem(
                order_id=order.id,
                name=itm.name,
                quantity=itm.quantity,
                unit=itm.unit,
                unit_price_zar=itm.unit_price_zar,
                total_zar=itm.total_zar,
            )
            db.add(order_item)
        db.commit()

        # -------------------------------------------------------------
        # STEP 4: Agent 2 (Treasury) Locks On-Chain Escrow on XRPL
        # -------------------------------------------------------------
        treasury_res = treasury_agent.execute_settlement(
            db=db,
            order_id=order.id,
            voucher=voucher,
        )

        # -------------------------------------------------------------
        # STEP 5: Agent 3 (Logistics) Dispatches Air Cargo Shipment
        # -------------------------------------------------------------
        logistics_res = logistics_agent.dispatch_and_track(
            db=db,
            order_id=order.id,
        )

        # Optional auto-delivery milestone for simulation demo
        if auto_deliver:
            logistics_agent.confirm_delivery_and_release(
                db=db,
                order_id=order.id,
                inspector_name="Thandi Mokoena",
            )

        db.refresh(order)

        return {
            "lifecycle_id": lifecycle_id,
            "order_id": order.id,
            "status": order.status,
            "supplier_name": supplier.name if supplier else proposal.supplier_id_or_address,
            "total_zar": order.total_zar,
            "total_rlusd": order.total_rlusd,
            "guard_status_code": guard_result.status_code,
            "guard_voucher_id": voucher.voucher_id,
            "xrpl_escrow_tx_hash": order.xrpl_tx_hash,
            "xrpl_escrow_sequence": order.escrow_sequence,
            "tracking_id": logistics_res["tracking_id"],
            "notes": order.notes,
        }

agent_orchestrator = AgentOrchestrator()

