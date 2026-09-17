import json
import re
import logging
from typing import Dict, Any, Optional
from .types import LLMConfig
from .dispatcher import dispatch_llm_request

logger = logging.getLogger(__name__)

def _clean_json_text(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()

async def extract_cv_info(cv_text: str, config: Optional[LLMConfig] = None) -> Dict[str, Any]:
    """
    Extracts structured job search preferences from resume text.
    """
    if not config:
        raise ValueError("Kein KI-Modell konfiguriert. Bitte in den Einstellungen einrichten.")

    prompt = (
        "Analyze the following CV / Resume text and extract desired job search criteria. "
        "Extract: job_title, location (e.g. Düsseldorf, Germany or N/A), employment_type (Vollzeit, etc. or N/A), "
        "and keywords (array of strings).\n\n"
        f"CV Text:\n{cv_text}"
    )

    system_instruction = (
        "You are an expert recruiter and CV analyst. "
        "Extract structured job search preferences. Respond strictly in JSON."
    )

    response_text = await dispatch_llm_request(
        config=config,
        prompt=prompt,
        system_instruction=system_instruction,
        format_json=True
    )

    cleaned = _clean_json_text(response_text)
    return json.loads(cleaned)
