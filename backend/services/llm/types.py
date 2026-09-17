from dataclasses import dataclass
from typing import Optional, Literal

ProviderType = Literal["ollama", "gemini", "openai", "custom"]

@dataclass
class LLMConfig:
    provider_type: ProviderType
    model_name: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    name: Optional[str] = None
    id: Optional[int] = None
    is_default: bool = False
