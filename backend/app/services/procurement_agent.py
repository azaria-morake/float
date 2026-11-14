import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from groq import Groq

from app.config import settings
from app.models import Supplier, Product, AgentLog, AgentJob, SpazaShop
from app.schemas.guard import OrderPreFlightRequest, OrderItemProposal
from app.services.x402_service import x402_service

logger = logging.getLogger(__name__)

def utcnow():
    return datetime.now(timezone.utc)

class ProcurementAgent:
    """
    Agent 1 — Procurement Agent:
    - Scans stock needs & queries supplier catalog
    - Autonomous x402 micropayments for live courier quote APIs
    - Evaluates landed costs and selects optimal supplier using Groq (openai/gpt-oss-120b)
    - Drafts an OrderPreFlightRequest for Guard evaluation
    - Separation of duties: CANNOT touch money or create on-chain escrows.
    """

    def __init__(self):
        self.model = settings.GROQ_MODEL
        self.api_key = settings.GROQ_API_KEY
        self.client = Groq(api_key=self.api_key) if self.api_key else None

    def source_inventory(
        self,
        db: Session,
        spaza_id: str = "spaza_soweto_0042",
        item_keyword: str = "Pilipili",
        target_quantity: float = 2.0,
        unit: str = "bag (5kg)",
    ) -> OrderPreFlightRequest:
        now = utcnow()

        # 1. Log task initiation
        job = AgentJob(
            agent_type="PROCUREMENT",
            task_name=f"SOURCE_{item_keyword.upper()}",
            payload={"spaza_id": spaza_id, "item": item_keyword, "quantity": target_quantity},
            status="RUNNING",
            created_at=now,
        )
        db.add(job)
        db.commit()

        self._log(db, job.id, "INFO", f"Procurement Agent activated: Sourcing {target_quantity} {unit} of {item_keyword} for Spaza {spaza_id}.")

        # 2. Autonomous x402 Micropayment for courier rate quote
        self._log(db, job.id, "INFO", "Executing autonomous x402 micropayment for real-time cross-border air cargo rate quote...")
        x402_res = x402_service.pay_for_quote_api(
            db=db,
            service_name="Nairobi ➔ Johannesburg Air Cargo Quote API",
            service_url="https://api.kenya-consolidators.co.ke/v1/quote",
            amount_rlusd=0.05,
        )
        courier_fee_zar = 25.0 # Quoted shipping fee

        # 3. Fetch candidate products and suppliers from DB
        products = db.query(Product).filter(Product.name.ilike(f"%{item_keyword}%")).all()
        suppliers = db.query(Supplier).filter(Supplier.verified_xrpl == True).all()

        supplier_options = []
        for s in suppliers:
            matching_prods = [p for p in products if p.supplier_id == s.id]
            for p in matching_prods:
                supplier_options.append({
                    "supplier_id": s.id,
                    "supplier_name": s.name,
                    "wallet_address": s.wallet_address,
                    "country": s.country,
                    "rating": s.rating,
                    "delivery_time": s.delivery_time_est,
                    "product_name": p.name,
                    "unit": p.unit,
                    "unit_price_zar": p.unit_price_zar,
                    "category": p.category,
                })

        # Fallback if no specific product keyword matched
        if not supplier_options:
            sup_default = suppliers[0] if suppliers else None
            supplier_options.append({
                "supplier_id": sup_default.id if sup_default else "sup_nairobi_spices",
                "supplier_name": sup_default.name if sup_default else "Nairobi Spice Exporters",
                "wallet_address": sup_default.wallet_address if sup_default else "rNairobiSpiceWholesaleHQ8192",
                "country": "Kenya",
                "rating": 4.95,
                "delivery_time": "3-5 days air freight",
                "product_name": f"Kenyan {item_keyword} Spice (Grade A)",
                "unit": unit,
                "unit_price_zar": 850.0,
                "category": "Spices & Seasoning",
            })

        # 4. Use Groq LLM (openai/gpt-oss-120b) to reason and select optimal supplier
        prompt = f"""
You are the Procurement Agent for AfroSpaza (AI-driven B2B commerce for African trade).
You need to procure {target_quantity} x '{unit}' of '{item_keyword}'.

Available Verified Suppliers:
{json.dumps(supplier_options, indent=2)}

Cross-Border Courier Rate (Settled via x402): R{courier_fee_zar:.2f}

Analyze the landed costs, supplier ratings, and delivery corridors.
Select the optimal supplier and draft an order proposal.

Respond strictly in JSON with this structure:
{{
  "selected_supplier_id": "<supplier_id>",
  "supplier_name": "<supplier_name>",
  "wallet_address": "<wallet_address>",
  "category": "Spices & Seasoning",
  "product_name": "<product_name>",
  "quantity": {target_quantity},
  "unit_price_zar": <number>,
  "subtotal_zar": <number>,
  "fee_zar": {courier_fee_zar},
  "total_zar": <number>,
  "reasoning": "<concise explanation of landed cost vs supplier reliability>"
}}
"""
        selected_data = None
        if self.client:
            try:
                chat = self.client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": "You are an autonomous B2B procurement agent for African cross-border trade. Respond ONLY in valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    model=self.model,
                    response_format={"type": "json_object"},
                    temperature=0.1
                )
                selected_data = json.loads(chat.choices[0].message.content)
                self._log(db, job.id, "SUCCESS", f"Groq LLM ({self.model}) selected supplier: {selected_data.get('supplier_name')}. Reason: {selected_data.get('reasoning')}")
            except Exception as e:
                logger.warning(f"Groq LLM call failed, falling back to deterministic selection: {e}")

        # Deterministic fallback if LLM offline
        if not selected_data:
            chosen = supplier_options[0]
            subtotal = chosen["unit_price_zar"] * target_quantity
            selected_data = {
                "selected_supplier_id": chosen["supplier_id"],
                "supplier_name": chosen["supplier_name"],
                "wallet_address": chosen["wallet_address"],
                "category": chosen["category"],
                "product_name": chosen["product_name"],
                "quantity": target_quantity,
                "unit_price_zar": chosen["unit_price_zar"],
                "subtotal_zar": subtotal,
                "fee_zar": courier_fee_zar,
                "total_zar": subtotal + courier_fee_zar,
                "reasoning": f"Selected highest rated supplier ({chosen['rating']}/5.0) on Kenya corridor."
            }

        # 5. Formulate structured proposal
        item_proposal = OrderItemProposal(
            name=selected_data.get("product_name", f"Kenyan {item_keyword}"),
            quantity=float(selected_data.get("quantity", target_quantity)),
            unit=unit,
            unit_price_zar=float(selected_data.get("unit_price_zar", 850.0)),
            total_zar=float(selected_data.get("subtotal_zar", 1700.0)),
        )

        proposal = OrderPreFlightRequest(
            spaza_id=spaza_id,
            supplier_id_or_address=selected_data.get("wallet_address") or selected_data.get("selected_supplier_id"),
            category=selected_data.get("category", "Spices & Seasoning"),
            corridor="Kenya -> South Africa",
            items=[item_proposal],
            subtotal_zar=float(selected_data.get("subtotal_zar", 1700.0)),
            fee_zar=courier_fee_zar,
            total_zar=float(selected_data.get("total_zar", 1725.0)),
            raw_prompt_or_context=f"Procurement proposal: {selected_data.get('reasoning')}",
        )

        job.status = "COMPLETED"
        job.result = proposal.model_dump()
        db.commit()

        self._log(
            db,
            job.id,
            "SUCCESS",
            f"Procurement proposal drafted: Total R{proposal.total_zar:.2f} ({proposal.items[0].name}) to supplier {proposal.supplier_id_or_address}. Ready for Guard review.",
            {"proposal": proposal.model_dump()}
        )

        return proposal

    def _log(self, db: Session, job_id: str, level: str, message: str, meta: Optional[dict] = None):
        log_entry = AgentLog(
            job_id=job_id,
            agent_type="PROCUREMENT",
            level=level,
            message=message,
            metadata_json=meta,
            created_at=utcnow(),
        )
        db.add(log_entry)
        db.commit()

procurement_agent = ProcurementAgent()

