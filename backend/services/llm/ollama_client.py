import logging
import httpx
from typing import List

logger = logging.getLogger(__name__)

async def fetch_ollama_models(base_url: str = "http://localhost:11434") -> List[str]:
    """
    Queries local or remote Ollama tags API to auto-detect installed models.
    """
    clean_url = (base_url or "http://localhost:11434").rstrip("/")
    url = f"{clean_url}/api/tags"
    
    async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()
        models = data.get("models", [])
        return [m.get("name") for m in models if m.get("name")]

async def call_ollama(
    base_url: str,
    model: str,
    prompt: str,
    system_instruction: str = "",
    format_json: bool = True
) -> str:
    """
    Sends chat completion request to Ollama endpoint with JSON format enforcement.
    """
    clean_url = (base_url or "http://localhost:11434").rstrip("/")
    url = f"{clean_url}/api/chat"

    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "keep_alive": "2m",
    }
    if format_json:
        payload["format"] = "json"

    async with httpx.AsyncClient(timeout=httpx.Timeout(900.0)) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        return data.get("message", {}).get("content", "")

async def unload_ollama_models(base_url: str = "http://localhost:11434") -> None:
    """
    Tells Ollama to immediately release loaded models from RAM.
    """
    clean_url = (base_url or "http://localhost:11434").rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
            ps_res = await client.get(f"{clean_url}/api/ps")
            if ps_res.status_code == 200:
                running = ps_res.json().get("models", [])
                for rm in running:
                    m_name = rm.get("name")
                    if m_name:
                        await client.post(f"{clean_url}/api/generate", json={"model": m_name, "keep_alive": 0})
    except Exception as e:
        logger.warning(f"Error unloading Ollama models: {e}")
