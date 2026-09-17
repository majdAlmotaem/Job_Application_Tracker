import logging
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.llm_provider import LLMProviderModel
from backend.services.llm import analyze_emails as service_analyze_emails, LLMConfig

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
    provider_id: Optional[int] = None

@router.post("/analyze-emails", status_code=status.HTTP_200_OK)
async def analyze_emails_endpoint(payload: EmailAnalysisRequest, db: Session = Depends(get_db)):
    """
    Receives list of Gmail messages and parses them via configured LLM provider.
    """
    # 1. Resolve LLM provider from DB
    provider = None
    if payload.provider_id:
        provider = db.query(LLMProviderModel).filter(LLMProviderModel.id == payload.provider_id).first()
    if not provider:
        provider = db.query(LLMProviderModel).filter(LLMProviderModel.is_default == True).first()
    if not provider:
        provider = db.query(LLMProviderModel).first()

    if not provider:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kein KI-Modell konfiguriert. Bitte richten Sie in den Einstellungen unter 'KI-Modelle' ein lokales (Ollama) oder Cloud-Modell ein."
        )

    llm_config = LLMConfig(
        id=provider.id,
        name=provider.name,
        provider_type=provider.provider_type, # type: ignore
        model_name=provider.model_name,
        api_key=provider.api_key,
        base_url=provider.base_url,
        is_default=provider.is_default
    )

    emails_dict = [email.model_dump() for email in payload.emails]
    num_emails = len(emails_dict)
    
    if num_emails == 0:
        logger.info("📧 Email sync triggered but email list was empty.")
        return {"results": []}
        
    total_chars = sum(
        len(e.get('subject', '')) + len(e.get('snippet', '')) + len(e.get('body', '') or '') 
        for e in emails_dict
    )
    
    logger.info(f"📧 Starting email sync using {llm_config.name} ({llm_config.model_name}). Received {num_emails} emails ({total_chars} chars).")
    
    try:
        results = await service_analyze_emails(emails_dict, llm_config)
        num_job_related = sum(1 for r in results if r.get('isJobRelated'))
        logger.info(f"Successfully analyzed {num_emails} emails using {llm_config.model_name}. Found {num_job_related} job-related emails.")
        return {"results": results}
    except Exception as e:
        import re
        raw_error = str(e)
        # Sanitize any sensitive tokens or keys before logging or returning
        error_msg = re.sub(r'key=[A-Za-z0-9_\-\.]+', 'key=[REDACTED]', raw_error)
        error_msg = re.sub(r'AIza[0-9A-Za-z-_]{35}', '[REDACTED]', error_msg)
        error_msg = re.sub(r'AQ\.[0-9A-Za-z-_]{20,}', '[REDACTED]', error_msg)

        logger.error(f"Email analysis failed: {error_msg}")
        
        if "rate limit" in error_msg.lower() or "429" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="Das KI-Modell ist derzeit überlastet (Rate-Limit überschritten). Bitte versuchen Sie es in Kürze erneut."
            )
        elif "503" in error_msg:
            raise HTTPException(
                status_code=503,
                detail="Der KI-Dienst ist vorübergehend nicht erreichbar. Bitte überprüfen Sie den Dienststatus."
            )
        elif "timeout" in error_msg.lower():
            raise HTTPException(
                status_code=504,
                detail="Zeitüberschreitung bei der Kommunikation mit dem KI-Modell."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"E-Mail-Analyse fehlgeschlagen: {error_msg}"
        )
