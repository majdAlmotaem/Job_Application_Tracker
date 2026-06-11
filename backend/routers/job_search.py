import io
import logging
import PyPDF2
from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.schemas.job_search import CVExtractionResult
from backend.services.gemini import extract_cv_info

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["job_search"])

@router.post("/extract-cv", response_model=CVExtractionResult)
async def extract_cv(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
    try:
        content = await file.read()
        logger.info(f"Processing uploaded CV: {file.filename} (Size: {len(content)} bytes)")
        
        pdf_file = io.BytesIO(content)
        reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
                
        if not text.strip():
            logger.warning(f"Failed to extract text from PDF '{file.filename}'")
            raise HTTPException(status_code=400, detail="Could not extract text from the PDF file")
            
        logger.info(f"Extracted {len(text)} characters of text from '{file.filename}' (Pages: {len(reader.pages)})")
        
        logger.info(f"Sending extracted text of '{file.filename}' to Gemini API for parsing...")
        extracted_data = await extract_cv_info(text)
        
        logger.info(f"Successfully parsed CV '{file.filename}' via Gemini API. Extracted criteria: {extracted_data}")
        return extracted_data
        
    except HTTPException as he:
        raise he
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error processing CV '{file.filename}': {error_msg}", exc_info=True)
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
            status_code=500,
            detail=f"Fehler beim Verarbeiten des Lebenslaufs: {error_msg}"
        )
