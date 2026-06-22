import os
import logging
import httpx
from typing import Dict, Any
from tenacity import retry, wait_random_exponential, stop_after_attempt, retry_if_exception_type

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent"

class Gemini503Error(Exception):
    """Exception raised when the Gemini API returns a 503 Service Unavailable error."""
    pass

@retry(
    wait=wait_random_exponential(multiplier=2, min=3, max=60),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type(Gemini503Error),
    reraise=True
)
async def _execute_gemini_request(client: httpx.AsyncClient, url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        response = await client.post(url, json=payload, timeout=httpx.Timeout(300.0))
    except httpx.RequestError as e:
        logger.error(f"Network error calling Gemini API: {e}")
        raise e

    if response.status_code == 553 or response.status_code == 503:
        logger.warning("Gemini API error (status 503). Retrying via Tenacity...")
        raise Gemini503Error("Gemini API returned server error status 503")

    response.raise_for_status()
    return response.json()

async def call_gemini_with_retry(payload: Dict[str, Any], retries: int = 4, delay_ms: int = 2000, model: str = "gemini-3.5-flash") -> Dict[str, Any]:
    """
    Executes a Gemini API request with exponential backoff via tenacity for server errors (503).
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("Missing GEMINI_API_KEY environment variable")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    async with httpx.AsyncClient(timeout=httpx.Timeout(300.0)) as client:
        try:
            response_data = await _execute_gemini_request(client, url, payload)
            
            # Token consumption extraction and logging
            usage = response_data.get("usageMetadata")
            if usage:
                in_tokens = usage.get("promptTokenCount", 0)
                out_tokens = usage.get("candidatesTokenCount", 0)
                total = usage.get("totalTokenCount", 0)
                logger.info(f"📊 Gemini Tokens -> Input: {in_tokens} | Output: {out_tokens} | Total: {total}")
                
            return response_data

        except httpx.TimeoutException as e:
            logger.error(f"Gemini API timeout occurred: {e}")
            raise e
        except httpx.HTTPStatusError as e:
            logger.error(f"Non-retryable HTTP error occurred: {e.response.status_code} - {e.response.text}")
            raise e
        except Gemini503Error as e:
            raise Exception("Gemini API returned server error status 503 after retries.") from e
        except Exception as e:
            logger.error("Error calling Gemini API", exc_info=True)
            raise e
