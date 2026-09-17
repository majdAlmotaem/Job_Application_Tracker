import io
import logging
import PyPDF2
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.llm_provider import LLMProviderModel
from backend.schemas.job_search import CVExtractionResult, JobSearchRequest, JobSearchResponse
from backend.services.llm import extract_cv_info, search_live_jobs, LLMConfig

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["job_search"])

def _get_active_llm_config(db: Session) -> LLMConfig:
    provider = db.query(LLMProviderModel).filter(LLMProviderModel.is_default == True).first()
    if not provider:
        provider = db.query(LLMProviderModel).first()
    if not provider:
        raise HTTPException(
            status_code=400,
            detail="Kein KI-Modell konfiguriert. Bitte in den Einstellungen unter 'KI-Modelle' einrichten."
        )
    return LLMConfig(
        id=provider.id,
        name=provider.name,
        provider_type=provider.provider_type, # type: ignore
        model_name=provider.model_name,
        api_key=provider.api_key,
        base_url=provider.base_url,
        is_default=provider.is_default
    )

@router.post("/extract-cv", response_model=CVExtractionResult)
async def extract_cv(file: UploadFile = File(...), db: Session = Depends(get_db)):
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
        
        config = _get_active_llm_config(db)
        logger.info(f"Sending extracted text of '{file.filename}' to LLM ({config.model_name}) for parsing...")
        extracted_data = await extract_cv_info(text, config)
        
        logger.info(f"Successfully parsed CV '{file.filename}'. Extracted criteria: {extracted_data}")
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

@router.post("/search", response_model=JobSearchResponse)
async def search_jobs(request: JobSearchRequest, db: Session = Depends(get_db)):
    logger.info(f"Received job search request: {request}")
    try:
        config = _get_active_llm_config(db)
        criteria = request.model_dump()
        results = await search_live_jobs(criteria, config)
        logger.info(f"Successfully retrieved {len(results)} live job search results")
        return {"results": results}
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error during live job search: {error_msg}")
        if "rate limit" in error_msg.lower() or "429" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="Das KI-Modell ist derzeit überlastet (Rate-Limit überschritten). Bitte versuchen Sie es in Kürze erneut."
            )
        elif "timeout" in error_msg.lower():
            raise HTTPException(
                status_code=504,
                detail="Zeitüberschreitung bei der Kommunikation mit dem KI-Modell."
            )
        raise HTTPException(
            status_code=500,
            detail=f"Fehler bei der Jobsuche: {error_msg}"
        )


from fastapi import Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.saved_search import SavedSearchModel
from backend.schemas.job_search import SavedSearchBase, SavedSearchResponse, SavedSearchUpdate
from typing import List

searches_router = APIRouter(prefix="/api/searches", tags=["saved_searches"])

@searches_router.get("", response_model=List[SavedSearchResponse])
def get_searches(db: Session = Depends(get_db)):
    try:
        # Check if table exists
        from sqlalchemy import inspect
        inspector = inspect(db.bind)
        if "saved_searches" not in inspector.get_table_names():
            logger.info("Table 'saved_searches' does not exist in database yet.")
            return []
        return db.query(SavedSearchModel).order_by(SavedSearchModel.id.asc()).all()
    except Exception as e:
        logger.error(f"Error querying saved searches: {e}")
        return []

@searches_router.post("", response_model=SavedSearchResponse)
def create_search(search: SavedSearchBase, db: Session = Depends(get_db)):
    db_search = SavedSearchModel(
        tab_name=search.tab_name,
        criteria=search.criteria,
        results=search.results
    )
    try:
        db.add(db_search)
        db.commit()
        db.refresh(db_search)
        return db_search
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create saved search: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Speichern der Suche.")

@searches_router.put("/{search_id}", response_model=SavedSearchResponse)
def update_search(search_id: int, search: SavedSearchUpdate, db: Session = Depends(get_db)):
    db_search = db.query(SavedSearchModel).filter(SavedSearchModel.id == search_id).first()
    if not db_search:
        raise HTTPException(status_code=404, detail="Saved search not found")
    
    if search.tab_name is not None:
        db_search.tab_name = search.tab_name
    if search.criteria is not None:
        db_search.criteria = search.criteria
    if search.results is not None:
        db_search.results = search.results
        
    try:
        db.commit()
        db.refresh(db_search)
        return db_search
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update saved search: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Aktualisieren der Suche.")

@searches_router.delete("/{search_id}")
def delete_search(search_id: int, db: Session = Depends(get_db)):
    db_search = db.query(SavedSearchModel).filter(SavedSearchModel.id == search_id).first()
    if not db_search:
        raise HTTPException(status_code=404, detail="Saved search not found")
    
    try:
        db.delete(db_search)
        db.commit()
        return {"status": "success", "message": "Search deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete saved search: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Löschen der Suche.")
