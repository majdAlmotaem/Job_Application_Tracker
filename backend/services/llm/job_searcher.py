import json
import logging
from typing import List, Dict, Any, Optional
from .types import LLMConfig
from .dispatcher import dispatch_llm_request

logger = logging.getLogger(__name__)

async def search_live_jobs(criteria: Dict[str, Any], config: Optional[LLMConfig] = None) -> List[Dict[str, Any]]:
    """
    Finds job postings matching criteria using the configured LLM.
    """
    if not config:
        raise ValueError("Kein KI-Modell konfiguriert. Bitte in den Einstellungen einrichten.")

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

    logger.info(f"Live job search: Job={job_title}, Location={location}, Type={employment_type}")

    prompt = (
        f"Führe eine Suche nach passenden aktuellen Stellenanzeigen durch für: "
        f"Jobtitel: '{job_title}', Ort: '{location}', Arbeitsmodell: '{employment_type}', Zeitraum: '{date_posted_str}'. "
        f"Gib maximal 10 passende Stellen als JSON-Array zurück mit Feldern: company, job_title, location, url, match_reason."
    )

    system_instruction = (
        "Du bist ein Stellenanzeigen-Finder. Antworte ausschließlich mit einem JSON-Array."
    )

    response_text = await dispatch_llm_request(
        config=config,
        prompt=prompt,
        system_instruction=system_instruction,
        format_json=True
    )

    cleaned = response_text.strip()
    if cleaned.startswith("```"):
        import re
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    data = json.loads(cleaned.strip())
    if isinstance(data, list):
        return data
    elif isinstance(data, dict) and "jobs" in data and isinstance(data["jobs"], list):
        return data["jobs"]
    return []
