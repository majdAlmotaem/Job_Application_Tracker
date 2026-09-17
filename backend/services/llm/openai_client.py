import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

async def call_openai_compatible(
    base_url: Optional[str],
    api_key: Optional[str],
    model: str,
    prompt: str,
    system_instruction: str = "",
    format_json: bool = True
) -> str:
    """
    Calls standard OpenAI or OpenAI-compatible (Groq, OpenRouter, LM Studio) /chat/completions.
    """
    clean_url = (base_url or "https://api.openai.com/v1").rstrip("/")
    url = f"{clean_url}/chat/completions"

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": model,
        "messages": messages,
    }
    if format_json:
        payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=httpx.Timeout(180.0)) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise ValueError("No choices returned from LLM provider")
        return choices[0].get("message", {}).get("content", "")
