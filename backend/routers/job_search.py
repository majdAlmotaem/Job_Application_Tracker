import io
import logging
import PyPDF2
from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.schemas.job_search import CVExtractionResult, JobSearchRequest, JobSearchResponse
from backend.services.gemini import extract_cv_info, search_live_jobs

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

@router.post("/search", response_model=JobSearchResponse)
async def search_jobs(request: JobSearchRequest):
    logger.info(f"Received job search request: {request}")
    try:
        criteria = request.dict()
        results = await search_live_jobs(criteria)
        logger.info(f"Successfully retrieved {len(results)} live job search results")
        return {"results": results}
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error during live job search: {error_msg}", exc_info=True)
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
            detail=f"Fehler bei der Live-Jobsuche: {error_msg}"
        )


from fastapi import Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.saved_search import SavedSearchModel
from backend.schemas.job_search import SavedSearchBase, SavedSearchResponse, SavedSearchUpdate
from typing import List

searches_router = APIRouter(prefix="/api/searches", tags=["saved_searches"])

from sqlalchemy import text

@searches_router.get("", response_model=List[SavedSearchResponse])
def get_searches(db: Session = Depends(get_db)):
    try:
        # Check if saved_searches table exists in SQLite database yet
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='saved_searches'"))
        if not result.fetchone():
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
    db.add(db_search)
    db.commit()
    db.refresh(db_search)
    return db_search

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
        
    db.commit()
    db.refresh(db_search)
    return db_search

@searches_router.delete("/{search_id}")
def delete_search(search_id: int, db: Session = Depends(get_db)):
    db_search = db.query(SavedSearchModel).filter(SavedSearchModel.id == search_id).first()
    if not db_search:
        raise HTTPException(status_code=404, detail="Saved search not found")
    
    db.delete(db_search)
    db.commit()
    return {"status": "success", "message": "Search deleted successfully"}


