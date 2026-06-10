from typing import List, Dict, Any
from backend.services.gemini import analyze_emails as service_analyze_emails

async def analyze_emails(emails: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Coordinates email analysis by passing the input emails to the Gemini API service.
    """
    return await service_analyze_emails(emails)
