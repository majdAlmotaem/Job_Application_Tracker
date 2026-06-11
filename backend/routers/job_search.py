import io
import PyPDF2
from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.schemas.job_search import CVExtractionResult
from backend.services.gemini import extract_cv_info

router = APIRouter(prefix="/api/jobs", tags=["job_search"])

@router.post("/extract-cv", response_model=CVExtractionResult)
async def extract_cv(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
    try:
        content = await file.read()
        pdf_file = io.BytesIO(content)
        reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
                
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from the PDF file")
            
        extracted_data = await extract_cv_info(text)
        return extracted_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CV: {str(e)}")
