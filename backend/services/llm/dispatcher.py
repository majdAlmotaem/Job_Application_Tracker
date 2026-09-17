import logging
from typing import Optional, Dict, Any
from .types import LLMConfig
from .ollama_client import call_ollama
from .openai_client import call_openai_compatible
from .gemini_client import call_gemini

logger = logging.getLogger(__name__)

async def dispatch_llm_request(
    config: LLMConfig,
    prompt: str,
    system_instruction: str = "",
    schema: Optional[Dict[str, Any]] = None,
    format_json: bool = True
) -> str:
    """
    Routes prompt to the configured LLM provider (Ollama, Gemini, OpenAI, or Custom).
    """
    provider_type = (config.provider_type or "ollama").lower()
    logger.info(f"🤖 Dispatching LLM request to provider '{provider_type}' using model '{config.model_name}'")

    if provider_type == "ollama":
        return await call_ollama(
            base_url=config.base_url or "http://localhost:11434",
            model=config.model_name,
            prompt=prompt,
            system_instruction=system_instruction,
            format_json=format_json
        )
    elif provider_type == "gemini":
        return await call_gemini(
            api_key=config.api_key or "",
            model=config.model_name or "gemini-2.0-flash",
            prompt=prompt,
            system_instruction=system_instruction,
            schema=schema
        )
    elif provider_type in ("openai", "custom"):
        return await call_openai_compatible(
            base_url=config.base_url,
            api_key=config.api_key,
            model=config.model_name,
            prompt=prompt,
            system_instruction=system_instruction,
            format_json=format_json
        )
    else:
        raise ValueError(f"Unbekannter LLM-Provider-Typ: {provider_type}")

async def test_provider_connection(config: LLMConfig) -> Dict[str, Any]:
    """
    Sends a lightweight ping to verify that the provider and model respond properly.
    """
    test_prompt = "Return a JSON object: {\"status\": \"ok\", \"message\": \"Connection successful\"}"
    response_text = await dispatch_llm_request(
        config=config,
        prompt=test_prompt,
        system_instruction="You are a test assistant. Output only JSON.",
        format_json=True
    )
    return {
        "success": True,
        "raw_response": response_text[:200]
    }
