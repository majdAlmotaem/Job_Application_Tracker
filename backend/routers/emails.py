import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from backend.controllers import email_controller as controller

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api",
    tags=["emails"]
)

class EmailPayload(BaseModel):
    id: str
    subject: str
    snippet: str
    body: Optional[str] = ""
    date: Optional[str] = ""

class EmailAnalysisRequest(BaseModel):
    emails: List[EmailPayload]

@router.post("/analyze-emails", status_code=status.HTTP_200_OK)
async def analyze_emails_endpoint(payload: EmailAnalysisRequest):
    """
    Receives list of Gmail messages and parses them via Gemini API.
    """
    # Convert Pydantic objects to dicts for controller/service
    emails_dict = [email.model_dump() for email in payload.emails]
    num_emails = len(emails_dict)
    
    if num_emails == 0:
        logger.info("📧 Email sync triggered but email list was empty.")
        return {"results": []}
        
    total_chars = sum(
        len(e.get('subject', '')) + len(e.get('snippet', '')) + len(e.get('body', '') or '') 
        for e in emails_dict
    )
    
    logger.info(f"📧 Starting email sync. Received {num_emails} emails for analysis (Total text size: {total_chars} characters).")
    
    try:
        logger.info(f"Sending {num_emails} emails to Gemini API for parsing and classification...")
        results = await controller.analyze_emails(emails_dict)
        
        num_job_related = sum(1 for r in results if r.get('isJobRelated'))
        logger.info(f"Successfully analyzed {num_emails} emails. Found {num_job_related} job-related emails.")
        
        for idx, r in enumerate(results):
            if r.get('isJobRelated'):
                logger.info(
                    f"   - [Job-Related] Email #{idx + 1} ({r.get('emailId')}): "
                    f"Company='{r.get('company')}', Role='{r.get('role')}', "
                    f"Status='{r.get('status')}', Classification='{r.get('classification')}'"
                )
            else:
                logger.debug(f"   - [Not Related] Email #{idx + 1} ({r.get('emailId')}) is spam/generic.")
                
        return {"results": results}
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Email analysis failed: {error_msg}", exc_info=True)
        
        if "rate limit" in error_msg.lower() or "429" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="Die Gemini-API ist derzeit überlastet (Rate-Limit überschritten). Bitte versuchen Sie es in einer Minute erneut."
            )
        elif "503" in error_msg:
            raise HTTPException(
                status_code=503,
                detail="Die Gemini-API ist vorübergehend nicht erreichbar (Service Unavailable / Status 503). Bitte versuchen Sie es gleich noch einmal."
            )
        elif "timeout" in error_msg.lower():
            raise HTTPException(
                status_code=504,
                detail="Zeitüberschreitung bei der Kommunikation mit der Gemini-API."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gemini email analysis failed: {error_msg}"
        )
