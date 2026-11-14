from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite:///./afrospaza.db"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # XRPL
    XRPL_NETWORK: str = "testnet"
    XRPL_NODE_URL: str = "wss://s.altnet.rippletest.net:51233"
    XRPL_FAUCET_URL: str = "https://faucet.altnet.rippletest.net/accounts"
    RLUSD_ISSUER: str = "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV"

    # t54 x402 Facilitator
    T54_FACILITATOR_URL: str = "https://xrpl-facilitator-testnet.t54.ai"

    # Privy Configuration
    PRIVY_APP_ID: Optional[str] = None
    PRIVY_APP_SECRET: Optional[str] = None
    PRIVY_VERIFICATION_KEY: Optional[str] = None

    # Groq LLM Configuration
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    # Guard Security
    GUARD_SECRET_KEY: str = "dev_guard_secret_key_change_in_prod"
    CONTROL_PLANE_SECRET: str = "dev_control_plane_secret"

settings = Settings()

