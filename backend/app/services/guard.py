import re
import hmac
import hashlib
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from app.config import settings
from app.models import (
    Mandate,
    SpendingRule,
    Supplier,
    Order,
    AgentLog,
    SimulationLog,
)
from app.schemas.guard import (
    OrderPreFlightRequest,
    PreFlightCheckResponse,
    GuardVoucher,
)

def utcnow():
    return datetime.now(timezone.utc)

# Deterministic adversarial patterns (strictly non-LLM)
ADVERSARIAL_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.IGNORECASE),
    re.compile(r"system\s+override", re.IGNORECASE),
    re.compile(r"drain\s+wallet", re.IGNORECASE),
    re.compile(r"bypass\s+limit", re.IGNORECASE),
    re.compile(r"admin\s+override", re.IGNORECASE),
    re.compile(r"<script.*?>", re.IGNORECASE),
    re.compile(r"drop\s+table", re.IGNORECASE),
    re.compile(r"force\s+settle", re.IGNORECASE),
]

def generate_guard_voucher(
    spaza_id: str,
    supplier_address: str,
    total_zar: float,
    total_rlusd: float,
    validity_minutes: int = 15,
) -> GuardVoucher:
    """Generates an HMAC-SHA256 signed voucher that proves the Guard approved this specific transaction."""
    voucher_id = f"vch_{uuid.uuid4().hex[:12]}"
    nonce = uuid.uuid4().hex[:16]
    expires_at = utcnow() + timedelta(minutes=validity_minutes)

    message = f"{voucher_id}:{spaza_id}:{supplier_address}:{total_zar:.2f}:{total_rlusd:.2f}:{nonce}:{int(expires_at.timestamp())}"
    signature = hmac.new(
        settings.GUARD_SECRET_KEY.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

    return GuardVoucher(
        voucher_id=voucher_id,
        spaza_id=spaza_id,
        supplier_address=supplier_address,
        total_zar=total_zar,
        total_rlusd=total_rlusd,
        expires_at=expires_at,
        nonce=nonce,
        signature=signature,
    )

def verify_guard_voucher(voucher: GuardVoucher) -> Tuple[bool, str]:
    """Cryptographically verifies a Guard Voucher before on-chain execution."""
    if voucher.expires_at < utcnow():
        return False, "Voucher has expired"

    message = f"{voucher.voucher_id}:{voucher.spaza_id}:{voucher.supplier_address}:{voucher.total_zar:.2f}:{voucher.total_rlusd:.2f}:{voucher.nonce}:{int(voucher.expires_at.timestamp())}"
    expected_signature = hmac.new(
        settings.GUARD_SECRET_KEY.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, voucher.signature):
        return False, "Invalid cryptographic voucher signature"

    return True, "Voucher verified successfully"


class GuardEngine:
    """
    Deterministic, rules-only Guard Service for AfroSpaza.
    Advisory filter executing pre-flight semantic checks that the ledger cannot perform:
    - Emergency Kill Switch
    - Daily budget caps & safety reserves
    - Supplier whitelist & verified XRPL status
    - Per-category spending caps & double-approval mandates
    - Duplicate order prevention (catches agent retry loops)
    - Anti-adversarial prompt injection screening
    """

    @classmethod
    def evaluate_preflight(
        cls,
        db: Session,
        request: OrderPreFlightRequest,
    ) -> PreFlightCheckResponse:
        now = utcnow()

        # ---------------------------------------------------------
        # 1. Fetch Mandate
        # ---------------------------------------------------------
        mandate = db.query(Mandate).filter(Mandate.spaza_id == request.spaza_id).first()
        if not mandate:
            return PreFlightCheckResponse(
                allowed=False,
                status_code="MANDATE_NOT_FOUND",
                reason=f"No active mandate found for Spaza ID: {request.spaza_id}",
            )

        # ---------------------------------------------------------
        # 2. Check Emergency Kill Switch
        # ---------------------------------------------------------
        if mandate.kill_switch_active:
            reason = f"Execution blocked by active Emergency Kill Switch. Reason: {mandate.kill_switch_reason or 'Owner manual trigger'}"
            cls._log_agent_event(db, request.spaza_id, "GUARD", "SECURITY", reason, {"kill_switch": True})
            return PreFlightCheckResponse(
                allowed=False,
                status_code="KILL_SWITCH_ACTIVE",
                reason=reason,
                security_event_logged=True,
            )

        # ---------------------------------------------------------
        # 3. Deterministic Adversarial Screening
        # ---------------------------------------------------------
        full_text_to_screen = f"{request.raw_prompt_or_context or ''} " + " ".join(
            [item.name for item in request.items]
        )
        for pattern in ADVERSARIAL_PATTERNS:
            if pattern.search(full_text_to_screen):
                reason = "Adversarial injection payload intercepted by Guard rule filter."
                cls._log_simulation(
                    db,
                    attack_type="PROMPT_INJECTION",
                    payload_summary=full_text_to_screen[:300],
                    layer="GUARD",
                    reason=reason,
                    logs=[
                        "Guard intercepted suspicious pattern in input payload.",
                        f"Matched filter pattern: {pattern.pattern}",
                        "Voucher issuance DENIED with zero fund exposure."
                    ],
                )
                cls._log_agent_event(db, request.spaza_id, "GUARD", "SECURITY", reason, {"matched_pattern": pattern.pattern})
                return PreFlightCheckResponse(
                    allowed=False,
                    status_code="ADVERSARIAL_PAYLOAD_DETECTED",
                    reason=reason,
                    security_event_logged=True,
                )

        # ---------------------------------------------------------
        # 4. Daily Budget Headroom Check
        # ---------------------------------------------------------
        remaining_budget = mandate.total_daily_budget_zar - mandate.used_today_zar
        if request.total_zar > remaining_budget:
            reason = f"Order total R{request.total_zar:.2f} exceeds remaining daily budget of R{remaining_budget:.2f} (Daily limit: R{mandate.total_daily_budget_zar:.2f})."
            cls._log_agent_event(db, request.spaza_id, "GUARD", "WARN", reason, {"requested": request.total_zar, "remaining": remaining_budget})
            return PreFlightCheckResponse(
                allowed=False,
                status_code="DAILY_BUDGET_EXCEEDED",
                reason=reason,
                remaining_budget_zar=remaining_budget,
            )

        # ---------------------------------------------------------
        # 5. Minimum Safety Reserve Check
        # ---------------------------------------------------------
        projected_buffer = remaining_budget - request.total_zar
        if projected_buffer < mandate.min_safety_reserve_zar:
            reason = f"Order breaches minimum safety reserve buffer of R{mandate.min_safety_reserve_zar:.2f}. Projected reserve would be R{projected_buffer:.2f}."
            cls._log_agent_event(db, request.spaza_id, "GUARD", "WARN", reason, {"projected_buffer": projected_buffer})
            return PreFlightCheckResponse(
                allowed=False,
                status_code="SAFETY_RESERVE_BREACH",
                reason=reason,
                remaining_budget_zar=remaining_budget,
            )

        # ---------------------------------------------------------
        # 6. Supplier Lookup & Vetted Whitelist Verification
        # ---------------------------------------------------------
        supplier = db.query(Supplier).filter(
            (Supplier.id == request.supplier_id_or_address) |
            (Supplier.wallet_address == request.supplier_id_or_address)
        ).first()

        if not supplier:
            reason = f"Supplier '{request.supplier_id_or_address}' does not exist in the vetted suppliers directory."
            cls._log_simulation(
                db,
                attack_type="UNVETTED_SELLER",
                payload_summary=f"Unregistered supplier: {request.supplier_id_or_address}",
                layer="GUARD",
                reason=reason,
                logs=["Guard evaluated supplier registry.", "Supplier not found in verified registry.", "BLOCKED."],
            )
            cls._log_agent_event(db, request.spaza_id, "GUARD", "WARN", reason, {"supplier": request.supplier_id_or_address})
            return PreFlightCheckResponse(
                allowed=False,
                status_code="UNVETTED_SELLER",
                reason=reason,
                security_event_logged=True,
            )

        if not supplier.verified_xrpl:
            reason = f"Supplier '{supplier.name}' ({supplier.wallet_address}) is not marked as verified on XRPL."
            cls._log_agent_event(db, request.spaza_id, "GUARD", "WARN", reason)
            return PreFlightCheckResponse(
                allowed=False,
                status_code="UNVERIFIED_XRPL_SELLER",
                reason=reason,
            )

        if not supplier.trustline_active:
            reason = f"Supplier '{supplier.name}' has no active RLUSD trustline on XRPL Testnet."
            cls._log_agent_event(db, request.spaza_id, "GUARD", "WARN", reason)
            return PreFlightCheckResponse(
                allowed=False,
                status_code="UNVERIFIED_XRPL_SELLER",
                reason=reason,
            )

        # ---------------------------------------------------------
        # 7. Corridor Verification
        # ---------------------------------------------------------
        if request.corridor and "kenya" in request.corridor.lower():
            if supplier.country.lower() not in ["kenya", "south africa"]:
                reason = f"Supplier origin ({supplier.country}) violates corridor mandate ({request.corridor})."
                cls._log_agent_event(db, request.spaza_id, "GUARD", "WARN", reason)
                return PreFlightCheckResponse(
                    allowed=False,
                    status_code="UNAUTHORIZED_CORRIDOR",
                    reason=reason,
                )

        # ---------------------------------------------------------
        # 8. Category Spending Rule Evaluation
        # ---------------------------------------------------------
        matching_rule = next(
            (r for r in mandate.rules if r.category.lower() == request.category.lower()),
            None
        )

        if matching_rule:
            if not matching_rule.enabled:
                reason = f"Purchasing for category '{matching_rule.category}' is currently disabled in the mandate."
                return PreFlightCheckResponse(
                    allowed=False,
                    status_code="CATEGORY_RULE_DISABLED",
                    reason=reason,
                    evaluated_category=matching_rule.category,
                    rule_id=matching_rule.id,
                )

            # Check single order ceiling
            if request.total_zar > matching_rule.max_single_tx_zar:
                reason = f"Order total R{request.total_zar:.2f} exceeds single order ceiling of R{matching_rule.max_single_tx_zar:.2f} for '{matching_rule.category}'."
                cls._log_simulation(
                    db,
                    attack_type="OVERSPEND_EXPLOIT",
                    payload_summary=f"Single order R{request.total_zar} exceeds cap R{matching_rule.max_single_tx_zar}",
                    layer="GUARD",
                    reason=reason,
                    logs=["Guard checked single order cap.", f"Cap: R{matching_rule.max_single_tx_zar}", f"Requested: R{request.total_zar}", "BLOCKED."],
                )
                cls._log_agent_event(db, request.spaza_id, "GUARD", "WARN", reason)
                return PreFlightCheckResponse(
                    allowed=False,
                    status_code="SINGLE_TX_LIMIT_EXCEEDED",
                    reason=reason,
                    evaluated_category=matching_rule.category,
                    rule_id=matching_rule.id,
                    security_event_logged=True,
                )

            # Check rule-level supplier whitelist
            if matching_rule.allowed_sellers and len(matching_rule.allowed_sellers) > 0:
                is_whitelisted = (
                    supplier.id in matching_rule.allowed_sellers or
                    supplier.wallet_address in matching_rule.allowed_sellers or
                    request.supplier_id_or_address in matching_rule.allowed_sellers or
                    "all" in matching_rule.allowed_sellers
                )
                if not is_whitelisted:
                    reason = f"Supplier '{supplier.name}' ({supplier.wallet_address}) is not whitelisted for category '{matching_rule.category}'."
                    cls._log_agent_event(db, request.spaza_id, "GUARD", "WARN", reason)
                    return PreFlightCheckResponse(
                        allowed=False,
                        status_code="UNVETTED_SELLER",
                        reason=reason,
                        evaluated_category=matching_rule.category,
                        rule_id=matching_rule.id,
                    )

            # Check Double Approval Requirement
            if matching_rule.requires_double_approval and not request.human_approval_token:
                reason = f"Category '{matching_rule.category}' requires explicit human double-approval. Approval token required."
                cls._log_agent_event(db, request.spaza_id, "GUARD", "INFO", reason)
                return PreFlightCheckResponse(
                    allowed=False,
                    status_code="REQUIRES_HUMAN_APPROVAL",
                    reason=reason,
                    evaluated_category=matching_rule.category,
                    rule_id=matching_rule.id,
                )

        # ---------------------------------------------------------
        # 9. Duplicate Order Detection (Semantic Filter)
        # ---------------------------------------------------------
        # Protects against agent retry loops or race condition duplicates in the last 15 minutes
        window_start = now - timedelta(minutes=15)
        duplicate = db.query(Order).filter(
            Order.spaza_id == request.spaza_id,
            Order.supplier_id == supplier.id,
            Order.total_zar == request.total_zar,
            Order.status.in_(["ESCROW_LOCKED", "PENDING_QUOTES", "GUARD_APPROVED"]),
            Order.created_at >= window_start
        ).first()

        if duplicate:
            mins_ago = int((now - duplicate.created_at.replace(tzinfo=timezone.utc)).total_seconds() / 60) if duplicate.created_at.tzinfo else int((now - duplicate.created_at.replace(tzinfo=timezone.utc)).total_seconds() / 60)
            reason = f"Duplicate order detected: Identical order {duplicate.id} for R{request.total_zar:.2f} was already approved/placed {mins_ago} minute(s) ago."
            cls._log_agent_event(db, request.spaza_id, "GUARD", "WARN", reason, {"duplicate_order_id": duplicate.id})
            return PreFlightCheckResponse(
                allowed=False,
                status_code="DUPLICATE_ORDER_DETECTED",
                reason=reason,
            )

        # ---------------------------------------------------------
        # 10. SUCCESS: Issue Cryptographic Guard Voucher
        # ---------------------------------------------------------
        total_rlusd = round(request.total_zar / mandate.exchange_rate_rlusd_to_zar, 2)
        voucher = generate_guard_voucher(
            spaza_id=request.spaza_id,
            supplier_address=supplier.wallet_address,
            total_zar=request.total_zar,
            total_rlusd=total_rlusd,
        )

        success_msg = f"Guard check APPROVED: Order total R{request.total_zar:.2f} ({total_rlusd} RLUSD) to {supplier.name} satisfies all mandate policies. Voucher {voucher.voucher_id} issued."
        cls._log_agent_event(
            db,
            request.spaza_id,
            "GUARD",
            "SUCCESS",
            success_msg,
            {"voucher_id": voucher.voucher_id, "supplier": supplier.name, "category": request.category}
        )

        return PreFlightCheckResponse(
            allowed=True,
            status_code="APPROVED",
            reason="Pre-flight validation passed successfully. Guard voucher signed.",
            evaluated_category=matching_rule.category if matching_rule else request.category,
            rule_id=matching_rule.id if matching_rule else None,
            remaining_budget_zar=remaining_budget - request.total_zar,
            voucher=voucher,
        )

    @classmethod
    def _log_agent_event(
        cls,
        db: Session,
        spaza_id: str,
        agent_type: str,
        level: str,
        message: str,
        metadata: Optional[dict] = None
    ):
        try:
            log_entry = AgentLog(
                agent_type=agent_type,
                level=level,
                message=message,
                metadata_json=metadata,
                created_at=utcnow(),
            )
            db.add(log_entry)
            db.commit()
        except Exception:
            db.rollback()

    @classmethod
    def _log_simulation(
        cls,
        db: Session,
        attack_type: str,
        payload_summary: str,
        layer: str,
        reason: str,
        logs: list
    ):
        try:
            sim_entry = SimulationLog(
                attack_type=attack_type,
                payload_summary=payload_summary,
                intercepted=True,
                intercepting_layer=layer,
                reason=reason,
                action_taken="BLOCKED",
                logs=logs,
                created_at=utcnow(),
            )
            db.add(sim_entry)
            db.commit()
        except Exception:
            db.rollback()

