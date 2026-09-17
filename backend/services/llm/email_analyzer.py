import json
import re
import logging
from typing import List, Dict, Any
from .types import LLMConfig
from .dispatcher import dispatch_llm_request

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = (
    "You are an elite talent acquisition analyst specializing in the German job market (Deutschemarkt). "
    "Analyze German and English emails meticulously to extract job application statuses. "
    "Keep the job titles in their original German format (e.g. 'Softwareentwickler' or 'Webentwickler'). "
    "Produce location values as cities like 'Düsseldorf, Germany' or 'Cologne, Germany' if possible. "
    "Determine 'anstellungsart' as 'Festanstellung', 'Vollzeit', 'Teilzeit', 'Freie Mitarbeit' or 'N/A'. "
    "Respond strictly with a valid JSON array matching the requested schema."
)

SCHEMA = {
    "type": "ARRAY",
    "items": {
        "type": "OBJECT",
        "properties": {
            "emailId": {"type": "STRING"},
            "isJobRelated": {"type": "BOOLEAN"},
            "company": {"type": "STRING"},
            "role": {"type": "STRING"},
            "stage": {"type": "STRING"},
            "status": {"type": "STRING"},
            "classification": {"type": "STRING"},
            "location": {"type": "STRING"},
            "anstellungsart": {"type": "STRING"},
            "confidence": {"type": "NUMBER"},
            "summary": {"type": "STRING"},
            "suggestedAction": {"type": "STRING"}
        },
        "required": [
            "emailId", "isJobRelated", "company", "role", "stage", "status",
            "classification", "location", "anstellungsart", "confidence", "summary", "suggestedAction"
        ]
    }
}

def _clean_json_text(text: str) -> str:
    """Removes markdown code fence blocks if returned by model."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()

async def analyze_emails(emails: List[Dict[str, Any]], config: LLMConfig) -> List[Dict[str, Any]]:
    """
    Processes email messages in chunks of 5 using the configured LLM provider.
    """
    if not emails:
        return []

    chunk_size = 5
    max_body_chars = 2500
    chunks = [emails[i:i + chunk_size] for i in range(0, len(emails), chunk_size)]
    all_results = []

    for chunk_idx, chunk in enumerate(chunks):
        logger.info(f"Processing email chunk {chunk_idx + 1}/{len(chunks)} ({len(chunk)} emails, provider: {config.provider_type})...")
        email_parts = []
        for idx, email in enumerate(chunk):
            body = email.get('body', '')
            if len(body) > max_body_chars:
                body = body[:max_body_chars] + "\n... [gekürzt]"
            part = (
                f"--- EMAIL #{idx + 1} ---\n"
                f"ID: {email.get('id', '')}\n"
                f"Subject: {email.get('subject', '')}\n"
                f"Snippet: {email.get('snippet', '')}\n"
                f"Body: {body}\n"
                f"Date: {email.get('date', '')}\n"
                f"--------------------"
            )
            email_parts.append(part)

        email_list_prompt = "\n\n".join(email_parts)
        prompt = (
            "Analyze the following emails and determine if they are related to a job application.\n"
            "For each email, extract company, job title (keep German e.g. Softwareentwickler), and two separate fields:\n"
            "1. 'stage': Must be one of: 'Applied', 'Interview', 'Offer'.\n"
            "2. 'status': Must be one of: 'Open', 'Rejected', 'Accepted', 'Withdrawn'.\n"
            "For 'classification': Must be 'Neue Bewerbung' (confirmation of receipt) or 'Statuswechsel' (interview invite, rejection, offer, etc.).\n"
            "Only mark isJobRelated: true for actual job application confirmations, interview invites, rejections or offers.\n\n"
            f"Emails:\n{email_list_prompt}\n\n"
            "Respond strictly with a JSON array."
        )

        response_text = await dispatch_llm_request(
            config=config,
            prompt=prompt,
            system_instruction=SYSTEM_INSTRUCTION,
            schema=SCHEMA,
            format_json=True
        )

        try:
            cleaned = _clean_json_text(response_text)
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                all_results.extend(parsed)
            elif isinstance(parsed, dict) and "emails" in parsed and isinstance(parsed["emails"], list):
                all_results.extend(parsed["emails"])
            elif isinstance(parsed, dict) and "results" in parsed and isinstance(parsed["results"], list):
                all_results.extend(parsed["results"])
            elif isinstance(parsed, dict) and "applications" in parsed and isinstance(parsed["applications"], list):
                all_results.extend(parsed["applications"])
            elif isinstance(parsed, dict) and any(isinstance(v, list) for v in parsed.values()):
                first_list = next(v for v in parsed.values() if isinstance(v, list))
                all_results.extend(first_list)
            elif isinstance(parsed, dict) and "emailId" in parsed:
                all_results.append(parsed)
            else:
                logger.warning(f"Non-list JSON returned in chunk {chunk_idx + 1}: {parsed}")
        except Exception as e:
            logger.error(f"Failed to parse LLM JSON in chunk {chunk_idx + 1}: {e}. Raw: {response_text[:300]}")
            raise ValueError(f"Ungültige JSON-Antwort vom KI-Modell ({config.model_name}): {e}")

    return all_results
