from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from backend.controllers import email_controller as controller

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
    try:
        results = await controller.analyze_emails(emails_dict)
        return {"results": results}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gemini email analysis failed: {str(e)}"
        )
