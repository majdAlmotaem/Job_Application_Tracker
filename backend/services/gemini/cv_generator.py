import json
import logging
from typing import Dict, Any
from .client import call_gemini_with_retry

logger = logging.getLogger(__name__)

async def extract_cv_info(cv_text: str) -> Dict[str, Any]:
    """
    Constructs the prompt, configures the structured JSON schema, and calls the Gemini API to extract details from CV text.
    """
    prompt = (
        "Analyze the following CV / Resume text and extract the desired job search criteria. "
        "Extract the primary job title/position the candidate is looking for or fits best, the preferred city/location "
        "(or N/A), the employment type (Vollzeit, Teilzeit, Freie Mitarbeit, etc., or N/A), and a list of key technical skills / keywords.\n\n"
        f"CV Text:\n{cv_text}"
    )

    system_instruction = (
        "You are an expert recruiter and CV analyst. "
        "Extract structured job search preferences from the user's resume text. "
        "Respond strictly in the JSON format requested."
    )

    schema = {
        "type": "OBJECT",
        "properties": {
            "job_title": {
                "type": "STRING",
                "description": "The primary job title, position, or role the candidate is seeking or best qualified for (e.g., Frontend-Entwickler, Software Engineer)."
            },
            "location": {
                "type": "STRING",
                "description": "Preferred city/location or city/state (e.g., Düsseldorf, Germany, or Cologne, or N/A)."
            },
            "employment_type": {
                "type": "STRING",
                "description": "The type of employment preferred, usually Vollzeit, Teilzeit, Freie Mitarbeit, or N/A."
            },
            "keywords": {
                "type": "ARRAY",
                "items": {"type": "STRING"},
                "description": "A list of up to 10 key technical skills, frameworks, or programming languages from the CV (e.g., React, TypeScript, Python)."
            }
        },
        "required": ["job_title", "location", "employment_type", "keywords"]
    }

    payload = {
        "contents": {
            "parts": [
                {"text": prompt}
            ]
        },
        "systemInstruction": {
            "parts": [
                {"text": system_instruction}
            ]
        },
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": schema
        }
    }

    response_json = await call_gemini_with_retry(payload)
    
    try:
        candidates = response_json.get("candidates", [])
        if not candidates:
            raise ValueError("No candidates found in Gemini response")
            
        text = candidates[0].get("content", {}).get("parts", [])[0].get("text", "")
        if not text:
            raise ValueError("Empty text returned from Gemini")

        results = json.loads(text.strip())
        return results
    except Exception as e:
        logger.error(f"Failed to parse response text from Gemini in extract_cv_info: {e}")
        raise e
