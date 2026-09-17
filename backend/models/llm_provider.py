from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from backend.database import Base

class LLMProviderModel(Base):
    """
    SQLAlchemy model storing user-configured LLM providers and models.
    """
    __tablename__ = "llm_providers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)  # User-friendly label (e.g. "Ollama Llama 3.2")
    provider_type = Column(String, nullable=False)  # "ollama", "gemini", "openai", "custom"
    model_name = Column(String, nullable=False)  # e.g. "llama3.2:latest", "gpt-4o-mini"
    api_key = Column(String, nullable=True)  # Encrypted/masked or plaintext locally
    base_url = Column(String, nullable=True)  # e.g. "http://localhost:11434"
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
