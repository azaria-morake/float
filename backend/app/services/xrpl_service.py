import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session

import xrpl
from xrpl.clients import JsonRpcClient
from xrpl.wallet import Wallet, generate_faucet_wallet
from xrpl.models.transactions import (
    Payment,
    EscrowCreate,
    EscrowFinish,
    EscrowCancel,
    PaymentChannelCreate,
    PaymentChannelClaim,
    TrustSet,
)
from xrpl.models.requests import AccountInfo, AccountObjects, AccountLines
from xrpl.transaction import autofill_and_sign, submit_and_wait
from xrpl.utils import xrp_to_drops, drops_to_xrp, datetime_to_ripple_time
from xrpl.constants import CryptoAlgorithm

from app.config import settings
from app.models import Order, XRPLTransaction, SpazaShop, Supplier, AgentLog
from app.schemas.guard import GuardVoucher
from app.services.guard import verify_guard_voucher

logger = logging.getLogger(__name__)

def utcnow():
    return datetime.now(timezone.utc)

class XRPLService:
    def __init__(self, node_url: Optional[str] = None):
        # Prefer HTTPS JSON-RPC endpoint for xrpl-py JsonRpcClient
        raw_url = node_url or settings.XRPL_NODE_URL
        if raw_url.startswith("wss://"):
            # Map testnet websocket to JSON-RPC HTTP
            self.node_url = "https://s.altnet.rippletest.net:51234"
        else:
            self.node_url = raw_url
        self.client = JsonRpcClient(self.node_url)

    def get_or_fund_operator_wallet(self, seed: Optional[str] = None) -> Wallet:
        """Returns the operator wallet from seed or generates & funds a testnet wallet."""
        if seed:
            return Wallet.from_seed(seed)
        logger.info("Generating and funding a new XRPL testnet wallet via faucet...")
        wallet = generate_faucet_wallet(self.client)
        logger.info(f"Testnet wallet ready: {wallet.classic_address}")
        return wallet

    def get_account_balances(self, address: str) -> Dict[str, Any]:
        """Queries the live XRPL testnet for XRP balance, sequence, and owner count."""
        try:
            req = AccountInfo(account=address, ledger_index="validated")
            res = self.client.request(req)
            data = res.result["account_data"]
            
            xrp_balance = float(drops_to_xrp(data["Balance"]))
            sequence = data["Sequence"]
            owner_count = data["OwnerCount"]

            # Query RLUSD trustlines
            lines_req = AccountLines(account=address)
            lines_res = self.client.request(lines_req)
            rlusd_balance = 0.0
            for line in lines_res.result.get("lines", []):
                if line.get("currency") == "RLUSD":
                    rlusd_balance = float(line.get("balance", "0"))

            return {
                "address": address,
                "xrp_balance": xrp_balance,
                "rlusd_balance": rlusd_balance,
                "sequence": sequence,
                "owner_count": owner_count,
                "exists_on_ledger": True,
            }
        except Exception as e:
            logger.warning(f"Failed to query account_info for {address}: {e}")
            return {
                "address": address,
                "xrp_balance": 0.0,
                "rlusd_balance": 0.0,
                "sequence": 0,
                "owner_count": 0,
                "exists_on_ledger": False,
                "error": str(e),
            }

    def setup_rlusd_trustline(self, wallet: Wallet, issuer: Optional[str] = None, limit: str = "1000000") -> Dict[str, Any]:
        """Establishes an RLUSD trustline on XRPL Testnet."""
        rlusd_issuer = issuer or settings.RLUSD_ISSUER
        tx = TrustSet(
            account=wallet.classic_address,
            limit_amount={
                "currency": "RLUSD",
                "issuer": rlusd_issuer,
                "value": limit,
            },
        )
        signed = autofill_and_sign(tx, self.client, wallet)
        res = submit_and_wait(signed, self.client)
        return {
            "tx_hash": res.result["hash"],
            "result_code": res.result["meta"]["TransactionResult"],
            "issuer": rlusd_issuer,
        }

    def create_order_escrow(
        self,
        db: Session,
        order_id: str,
        voucher: GuardVoucher,
        buyer_wallet: Wallet,
        delay_seconds: int = 60,
        cancel_days: int = 7,
    ) -> Dict[str, Any]:
        """
        Executes EscrowCreate on XRPL Testnet:
        1. Enforces pre-flight Guard Voucher validity!
        2. Submits EscrowCreate locking funds until delivery.
        3. Updates database orders and xrpl_transactions tables.
        """
        # 1. Cryptographic check of Guard Voucher
        valid_voucher, v_reason = verify_guard_voucher(voucher)
        if not valid_voucher:
            raise ValueError(f"Treasury rejected Escrow creation: Guard Voucher invalid. {v_reason}")

        # 2. Lookup Order
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")

        # 3. Calculate Escrow parameters
        now = utcnow()
        # Escrow finish_after timestamp: time after which delivery proof / completion can be submitted
        finish_after = datetime_to_ripple_time(now + timedelta(seconds=delay_seconds))
        cancel_after = datetime_to_ripple_time(now + timedelta(days=cancel_days))

        # Convert order total to XRP drops (MVP testnet settlement)
        # Scale to 1.0 - 5.0 XRP for testnet demo to preserve wallet balance
        amount_xrp = max(1.0, min(10.0, round(order.total_zar / 1000.0, 2)))
        amount_drops = xrp_to_drops(amount_xrp)

        tx = EscrowCreate(
            account=buyer_wallet.classic_address,
            destination=voucher.supplier_address,
            amount=amount_drops,
            finish_after=finish_after,
            cancel_after=cancel_after,
        )

        signed = autofill_and_sign(tx, self.client, buyer_wallet)
        res = submit_and_wait(signed, self.client)

        tx_result = res.result["meta"]["TransactionResult"]
        tx_hash = res.result["hash"]
        escrow_seq = res.result["tx_json"]["Sequence"]

        # 4. Update Database
        order.status = "ESCROW_LOCKED"
        order.xrpl_tx_hash = tx_hash
        order.escrow_sequence = escrow_seq
        order.cancel_after = now + timedelta(days=cancel_days)

        xrpl_tx = XRPLTransaction(
            tx_hash=tx_hash,
            order_id=order.id,
            tx_type="EscrowCreate",
            sender_address=buyer_wallet.classic_address,
            destination_address=voucher.supplier_address,
            amount=f"{amount_xrp:.2f}",
            currency="XRP",
            fee_drops=res.result["tx_json"].get("Fee", "12"),
            ledger_index=res.result.get("ledger_index"),
            status="VALIDATED" if tx_result == "tesSUCCESS" else "FAILED",
            result_code=tx_result,
            raw_meta=res.result["meta"],
            created_at=now,
        )
        db.add(xrpl_tx)

        # Log agent activity
        agent_log = AgentLog(
            order_id=order.id,
            agent_type="TREASURY",
            level="SUCCESS" if tx_result == "tesSUCCESS" else "ERROR",
            message=f"XRPL EscrowCreate executed: {amount_xrp} XRP locked for supplier {voucher.supplier_address} (Seq: {escrow_seq}, Tx: {tx_hash}).",
            metadata_json={"tx_hash": tx_hash, "escrow_sequence": escrow_seq, "result": tx_result},
            created_at=now,
        )
        db.add(agent_log)
        db.commit()

        return {
            "order_id": order.id,
            "tx_hash": tx_hash,
            "escrow_sequence": escrow_seq,
            "result_code": tx_result,
            "amount_xrp": amount_xrp,
            "status": "ESCROW_LOCKED",
        }

    def finish_order_escrow(
        self,
        db: Session,
        order_id: str,
        operator_wallet: Wallet,
    ) -> Dict[str, Any]:
        """
        Executes EscrowFinish on XRPL Testnet upon delivery confirmation:
        Releases the locked escrow funds to the supplier.
        """
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")

        if not order.escrow_sequence:
            raise ValueError(f"Order {order_id} has no on-chain escrow_sequence recorded")

        # Lookup the account that originally created the Escrow on ledger
        create_tx = db.query(XRPLTransaction).filter(
            XRPLTransaction.order_id == order.id,
            XRPLTransaction.tx_type == "EscrowCreate",
        ).first()
        escrow_owner = create_tx.sender_address if create_tx else operator_wallet.classic_address

        tx = EscrowFinish(
            account=operator_wallet.classic_address,
            owner=escrow_owner,
            offer_sequence=order.escrow_sequence,
        )

        signed = autofill_and_sign(tx, self.client, operator_wallet)
        res = submit_and_wait(signed, self.client)

        tx_result = res.result["meta"]["TransactionResult"]
        tx_hash = res.result["hash"]
        now = utcnow()

        # Update order status
        if tx_result == "tesSUCCESS":
            order.status = "SETTLED"
            order.delivered_at = now
            order.settled_at = now
        
        xrpl_tx = XRPLTransaction(
            tx_hash=tx_hash,
            order_id=order.id,
            tx_type="EscrowFinish",
            sender_address=operator_wallet.classic_address,
            destination_address=order.supplier.wallet_address if order.supplier else "unknown",
            amount=str(order.total_rlusd),
            currency="XRP",
            fee_drops=res.result["tx_json"].get("Fee", "12"),
            ledger_index=res.result.get("ledger_index"),
            status="VALIDATED" if tx_result == "tesSUCCESS" else "FAILED",
            result_code=tx_result,
            raw_meta=res.result["meta"],
            created_at=now,
        )
        db.add(xrpl_tx)

        agent_log = AgentLog(
            order_id=order.id,
            agent_type="LOGISTICS",
            level="SUCCESS" if tx_result == "tesSUCCESS" else "ERROR",
            message=f"Escrow released to seller: {tx_result} (Tx: {tx_hash}). Order {order.id} marked as SETTLED.",
            metadata_json={"tx_hash": tx_hash, "result": tx_result},
            created_at=now,
        )
        db.add(agent_log)
        db.commit()

        return {
            "order_id": order.id,
            "tx_hash": tx_hash,
            "result_code": tx_result,
            "status": order.status,
        }

    def create_payment_channel(
        self,
        buyer_wallet: Wallet,
        destination_address: str,
        deposit_xrp: float,
        settle_delay: int = 86400,
    ) -> Dict[str, Any]:
        """
        Creates an on-ledger Payment Channel establishing the hard spending ceiling for an agent.
        """
        amount_drops = xrp_to_drops(deposit_xrp)
        tx = PaymentChannelCreate(
            account=buyer_wallet.classic_address,
            destination=destination_address,
            amount=amount_drops,
            settle_delay=settle_delay,
            public_key=buyer_wallet.public_key,
        )
        signed = autofill_and_sign(tx, self.client, buyer_wallet)
        res = submit_and_wait(signed, self.client)

        return {
            "tx_hash": res.result["hash"],
            "result_code": res.result["meta"]["TransactionResult"],
            "deposit_xrp": deposit_xrp,
            "account": buyer_wallet.classic_address,
            "destination": destination_address,
        }

# Singleton instance
xrpl_service = XRPLService()
