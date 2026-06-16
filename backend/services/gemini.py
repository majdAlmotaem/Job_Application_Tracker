import os
import json
import asyncio
import logging
import httpx
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent"

async def call_gemini_with_retry(payload: Dict[str, Any], retries: int = 4, delay_ms: int = 2000, model: str = "gemini-3.5-flash") -> Dict[str, Any]:
    """
    Executes a Gemini API request with exponential backoff for rate limits (429) or server errors (503).
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("Missing GEMINI_API_KEY environment variable")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        for i in range(retries):
            try:
                response = await client.post(url, json=payload)
                
                # Check for rate limits or server errors
                if response.status_code in [429, 503]:
                    status = response.status_code
                    msg = response.text.lower()
                    
                    if i == retries - 1:
                        if status == 429:
                            raise Exception("Gemini API rate limit exceeded. Please try again in a minute.")
                        else:
                            raise Exception(f"Gemini API returned server error status {status} after retries.")
                            
                    next_delay = (delay_ms * (2 ** i)) / 1000.0  # Convert to seconds
                    
                    # Try to parse wait time from 429 response if present
                    if status == 429:
                        try:
                            err_data = response.json()
                            err_msg = err_data.get("error", {}).get("message", "")
                            # Parse "Please retry in X seconds"
                            import re
                            match = re.search(r"Please retry in ([\d.]+)s", err_msg, re.IGNORECASE)
                            if match:
                                next_delay = float(match.group(1)) + 1.0
                        except Exception:
                            pass
                    
                    logger.warning(
                        f"Gemini API error (status {status}, attempt {i + 1}/{retries}). "
                        f"Retrying in {next_delay:.2f}s..."
                    )
                    await asyncio.sleep(next_delay)
                    continue
                
                response.raise_for_status()
                response_data = response.json()
                
                # Token Verbrauch extrahieren und loggen
                usage = response_data.get("usageMetadata")
                if usage:
                    in_tokens = usage.get("promptTokenCount", 0)
                    out_tokens = usage.get("candidatesTokenCount", 0)
                    total = usage.get("totalTokenCount", 0)
                    logger.info(f"📊 Gemini Tokens -> Input: {in_tokens} | Output: {out_tokens} | Total: {total}")
                    
                return response_data

            except httpx.TimeoutException as e:
                logger.error(f"Gemini API timeout occurred on attempt {i + 1}/{retries}: {e}")
                # We raise immediately on timeouts to avoid long retry loops
                raise e
            except httpx.HTTPStatusError as e:
                # Non-retryable HTTP errors
                logger.error(f"Non-retryable HTTP error occurred: {e.response.status_code} - {e.response.text}")
                raise e
            except Exception as e:
                logger.error("Error calling Gemini API", exc_info=True)
                if i == retries - 1:
                    raise e
                
                next_delay = (delay_ms * (2 ** i)) / 1000.0
                await asyncio.sleep(next_delay)
                
        raise Exception("Gemini API call failed after retries")

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
                "status": {
                    "type": "STRING",
                    "description": "The estimated hiring status. Must be one of: 'Applied', 'Interview', 'Rejected', 'Offer', 'Received' or 'Unknown'."
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
                "emailId", "isJobRelated", "company", "role", "status", "classification",
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
            "For each email, extract the hiring company, the job title/role (keep it in German as original, e.g. \"Softwareentwickler\"), estimate the current application status, the office/job location (e.g., \"Düsseldorf, Germany\" or \"Düsseldorf, Deutschland\"), the employment type (anstellungsart, e.g. \"Festanstellung\", \"Vollzeit\", \"Teilzeit\", \"Freie Mitarbeit\"), summarize the message, and offer action points.\n"
            "Only categorize an email as isJobRelated: true if it is an actual application confirmation (Applied), status update/recruiter follow-up, interview request (Interview), assessment, feedback, rejection (Rejected), or job offer (Offer). Standard newsletters, generic job alerts from social media, spam, or promotional material are NOT job related (isJobRelated: false).\n\n"
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


async def search_live_jobs(criteria: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Performs a live web search for job postings matching the criteria using Gemini 3.5 Flash and Google Search tool.
    Returns a list of matching job results.
    """
    logger.info(f"Starting live job search with criteria: {criteria}")
    
    prompt = f"""
    Du bist ein spezialisierter Recruiter. Führe eine präzise Live-Websuche nach aktuellen Stellenanzeigen durch, die exakt zu diesen Kriterien passen: {criteria}. 
    
    WICHTIGE SUCH-REGELN:
    1. Durchsuche fokussiert Premium-Jobportale (z.B. site:linkedin.com/jobs, site:stepstone.de, site:de.indeed.com, site:xing.com) oder direkte Karriereseiten von Unternehmen.
    2. Ignoriere generische Spam-Jobbörsen (Aggregatoren), die nur auf andere Portale weiterleiten.
    3. Die URL MUSS ein direkter, funktionierender Link zur Original-Stellenanzeige sein.
    
    Gib exakt maximal 10 hochrelevante Ergebnisse zurück. 
    Begründe in 'match_reason' in einem kurzen Satz auf Deutsch, warum der Job passt.
    """
    
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
        response_json = await call_gemini_with_retry(payload, model="gemini-3.5-flash")
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


