import json
import logging
from typing import List, Dict, Any
from .client import call_gemini_with_retry

logger = logging.getLogger(__name__)

async def analyze_emails(emails: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Constructs the prompt, configures the structured JSON schema, and calls the Gemini API to analyze the emails.
    Processes emails in chunks of 5 to avoid overloading the API.
    """
    if not emails:
        return []

    system_instruction = (
        "You are an elite talent acquisition analyst specializing in the German job market (Deutschemarkt). "
        "Analyze German and English emails meticulously to extract job application statuses. "
        "Keep the job titles in their original German format (e.g. 'Softwareentwickler' or 'Webentwickler'). "
        "Produce location values as cities like 'Düsseldorf, Germany' or 'Cologne, Germany' if possible. "
        "Determine 'anstellungsart' as 'Festanstellung', 'Vollzeit', 'Teilzeit', 'Freie Mitarbeit' or 'N/A'. "
        "Respond strictly in the JSON format requested."
    )

    schema = {
        "type": "ARRAY",
        "items": {
            "type": "OBJECT",
            "properties": {
                "emailId": {"type": "STRING"},
                "isJobRelated": {
                    "type": "BOOLEAN",
                    "description": "True if the email contains actual updates regarding a specific job application, an interview request, a rejection, an offer, or next steps in the hiring process."
                },
                "company": {
                    "type": "STRING",
                    "description": "The name of the company hiring (e.g., FINOVESTA GmbH, Google, Acme Corp, Unknown)."
                },
                "role": {
                    "type": "STRING",
                    "description": "The job title / role position in German if written in German (e.g., Softwareentwickler, Webentwickler, Backend-Entwickler, Unknown)."
                },
                "stage": {
                    "type": "STRING",
                    "description": "The pipeline progress stage. Must be one of: 'Applied' (application submitted), 'Interview' (technical, HR, or in-depth interview), 'Offer' (job offer received)."
                },
                "status": {
                    "type": "STRING",
                    "description": "The current outcome status. Must be one of: 'Open' (still in progress), 'Rejected' (company declined), 'Accepted' (candidate accepted offer), 'Withdrawn' (candidate withdrew)."
                },
                "classification": {
                    "type": "STRING",
                    "description": "Must be exactly 'Neue Bewerbung' (for emails confirming submission/receipt of a new application) or 'Statuswechsel' (for rejections, interview invitations, offers, assessments, feedback, or any other changes to an existing status)."
                },
                "location": {
                    "type": "STRING",
                    "description": "The job location if mentioned, e.g., 'Düsseldorf, Germany', 'Cologne, Germany' or 'N/A'."
                },
                "anstellungsart": {
                    "type": "STRING",
                    "description": "The employment type, usually in German like 'Festanstellung', 'Vollzeit', 'Teilzeit', 'Freie Mitarbeit' or 'N/A' if not specified."
                },
                "confidence": {
                    "type": "NUMBER",
                    "description": "Confidence score between 0.0 and 1.0"
                },
                "summary": {
                    "type": "STRING",
                    "description": "A highly concise 1-sentence summary of the email in German or English."
                },
                "suggestedAction": {
                    "type": "STRING",
                    "description": "Recommended next step for the user in German or English."
                }
            },
            "required": [
                "emailId", "isJobRelated", "company", "role", "stage", "status", "classification",
                "location", "anstellungsart", "confidence", "summary", "suggestedAction"
            ]
        }
    }

    # Split the emails list into chunks of max 5 emails
    chunk_size = 5
    chunks = [emails[i:i + chunk_size] for i in range(0, len(emails), chunk_size)]
    all_results = []

    for chunk_idx, chunk in enumerate(chunks):
        logger.info(f"Processing email chunk {chunk_idx + 1}/{len(chunks)} (size: {len(chunk)} emails)...")
        
        email_parts = []
        for idx, email in enumerate(chunk):
            body = email.get('body', '')
            if len(body) > 2500:
                body = body[:2500] + "\n... [Truncated due to length]"
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
            "Analyze the following emails (most are in German for the German job market) received by the user and determine if they are related to a job application.\n"
            "For each email, extract the hiring company, the job title/role (keep it in German as original, e.g. \"Softwareentwickler\"), and determine TWO separate fields:\n"
            "1. 'stage': The pipeline progress - must be one of: 'Applied' (application submitted), 'Interview' (technical/HR interview/phone screen), 'Offer' (job offer received).\n"
            "2. 'status': The outcome - must be one of: 'Open' (still active/in progress), 'Rejected' (company declined the candidate), 'Accepted' (candidate accepted an offer), 'Withdrawn' (candidate withdrew).\n"
            "IMPORTANT: stage and status are independent. For example, a rejection after an interview should be stage='Interview', status='Rejected'. A new application confirmation is stage='Applied', status='Open'.\n"
            "Also extract the office/job location (e.g., \"Düsseldorf, Germany\" or \"Düsseldorf, Deutschland\"), the employment type (anstellungsart, e.g. \"Festanstellung\", \"Vollzeit\", \"Teilzeit\", \"Freie Mitarbeit\"), summarize the message, and offer action points.\n"
            "Only categorize an email as isJobRelated: true if it is an actual application confirmation (stage=Applied), status update/recruiter follow-up, interview request (stage=Interview), assessment, feedback, rejection (status=Rejected), or job offer (stage=Offer). Standard newsletters, generic job alerts from social media, spam, or promotional material are NOT job related (isJobRelated: false).\n\n"
            "For each job-relevant email, you MUST classify it as:\n"
            "- 'Neue Bewerbung' if the email is a confirmation of a new application receipt (e.g., containing phrases like \"wir haben deine bewerbung bekommen\", \"danke für deine bewerbung\", \"eingangsbestätigung\", \"vielen dank für deine bewerbung\").\n"
            "- 'Statuswechsel' if the email represents a change or progress in status, such as an invite to an interview (\"interview\", \"gespräch\", \"telefonat\"), a rejection (\"absage\", \"nicht berücksichtigt\", \"anderweitig entschieden\"), or an offer (\"angebot\", \"arbeitsvertrag\", \"vertrag\").\n\n"
            f"Emails to analyze:\n{email_list_prompt}"
        )

        # Construct standard generateContent API payload
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
        
        # Extract response text
        try:
            candidates = response_json.get("candidates", [])
            if not candidates:
                raise ValueError("No candidates found in Gemini response")
                
            text = candidates[0].get("content", {}).get("parts", [])[0].get("text", "")
            if not text:
                raise ValueError("Empty text returned from Gemini")

            chunk_results = json.loads(text.strip())
            if isinstance(chunk_results, list):
                all_results.extend(chunk_results)
            else:
                logger.warning(f"Unexpected non-list format from Gemini in chunk {chunk_idx + 1}: {chunk_results}")
        except Exception as e:
            logger.error(f"Failed to parse response text from Gemini for chunk {chunk_idx + 1}: {e}")
            raise e

    return all_results
