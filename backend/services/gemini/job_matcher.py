import json
import logging
from typing import List, Dict, Any
from .client import call_gemini_with_retry

logger = logging.getLogger(__name__)

async def search_live_jobs(criteria: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Performs a live web search for job postings matching the criteria using Gemini 3.5 Flash and Google Search tool.
    Returns a list of matching job results.
    """
    job_title = criteria.get("job_title", "")
    location = criteria.get("location", "")
    employment_type = criteria.get("employment_type", "")
    date_posted_raw = criteria.get("date_posted", "anytime")

    date_posted_map = {
        "24h": "in den letzten 24 Stunden",
        "3days": "in den letzten 3 Tagen",
        "week": "in der letzten Woche",
        "month": "im letzten Monat"
    }
    date_posted_str = date_posted_map.get(date_posted_raw, "beliebiger Zeitpunkt")

    logger.info(f"Starting live job search. Core criteria: Job={job_title}, Location={location}, Type={employment_type}, DatePosted={date_posted_raw}")
    
    prompt = (
        f"Führe eine Websuche nach aktuellen Stellenanzeigen durch für: "
        f"Jobtitel: '{job_title}', Ort: '{location}', Arbeitsmodell: '{employment_type}', Veröffentlichungsdatum: '{date_posted_str}'. "
        f"Gib maximal 10 Ergebnisse zurück. Die URL muss ein direkter Link zur Originalanzeige sein. "
        f"Begründe kurz auf Deutsch in 'match_reason'."
    )
    
    schema = {
        "type": "ARRAY",
        "items": {
            "type": "OBJECT",
            "properties": {
                "company": {"type": "STRING"},
                "job_title": {"type": "STRING"},
                "location": {"type": "STRING"},
                "url": {"type": "STRING"},
                "match_reason": {"type": "STRING"}
            },
            "required": ["company", "job_title", "location", "url", "match_reason"]
        }
    }
    
    payload = {
        "contents": {
            "parts": [
                {"text": prompt}
            ]
        },
        "tools": [{"googleSearch": {}}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": schema
        }
    }
    
    try:
        response_json = await call_gemini_with_retry(payload, model="gemini-flash-lite-latest")
        candidates = response_json.get("candidates", [])
        if not candidates:
            raise ValueError("No candidates found in Gemini response")
            
        text = candidates[0].get("content", {}).get("parts", [])[0].get("text", "")
        if not text:
            raise ValueError("Empty text returned from Gemini")

        logger.info(f"Raw response text from Gemini: {text}")
        results = json.loads(text.strip())
        logger.info(f"Gemini search results payload decoded: {results}")
        if not isinstance(results, list):
            logger.warning(f"Expected a list of results, but got: {results}")
            return []
            
        return results
    except Exception as e:
        logger.error(f"Error in search_live_jobs calling Gemini: {e}", exc_info=True)
        raise e
