import logging
import httpx
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

async def fetch_gemini_models(api_key: str) -> List[str]:
    """
    Fetches available Gemini content generation models for the user's API key.
    """
    if not api_key:
        return []

    url = "https://generativelanguage.googleapis.com/v1beta/models"
    headers = {"x-goog-api-key": api_key}
    async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        models = []
        for m in data.get("models", []):
            methods = m.get("supportedGenerationMethods", [])
            name = m.get("name", "").replace("models/", "")
            if "generateContent" in methods and not any(x in name for x in ["image", "tts", "embedding", "audio"]):
                models.append(name)
        # Prioritize 2.5-flash and latest flash at the top
        priority_models = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.5-flash"]
        sorted_models = [m for m in priority_models if m in models] + [m for m in models if m not in priority_models]
        return sorted_models

async def call_gemini(
    api_key: str,
    model: str,
    prompt: str,
    system_instruction: str = "",
    schema: Optional[Dict[str, Any]] = None
) -> str:
    """
    Executes a direct request to the Google Gemini generateContent REST API.
    """
    if not api_key:
        raise ValueError("Google Gemini API-Key fehlt. Bitte in den Einstellungen konfigurieren.")

    clean_model = model or "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent"
    headers = {
        "x-goog-api-key": api_key,
        "Content-Type": "application/json"
    }

    generation_config: Dict[str, Any] = {"responseMimeType": "application/json"}
    if schema:
        generation_config["responseSchema"] = schema

    payload: Dict[str, Any] = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": generation_config
    }
    if system_instruction:
        payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    async with httpx.AsyncClient(timeout=httpx.Timeout(180.0)) as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("Keine Antwort von der Gemini API erhalten")
            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts:
                raise ValueError("Leere Antwort von der Gemini API")
            return parts[0].get("text", "")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise ValueError(
                    f"Gemini-Modell '{clean_model}' wurde nicht gefunden (404). Bitte wählen Sie ein gültiges Modell wie 'gemini-2.5-flash' oder 'gemini-flash-latest'."
                )
            raise e
