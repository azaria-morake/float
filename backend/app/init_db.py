import logging
from app.database import engine, Base
from app.models import (
    SpazaShop,
    Mandate,
    SpendingRule,
    Supplier,
    Product,
    Order,
    OrderItem,
    XRPLTransaction,
    AgentJob,
    AgentLog,
    X402Payment,
    SimulationLog,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    logger.info("Creating all database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Successfully created database tables.")

if __name__ == "__main__":
    init_db()

