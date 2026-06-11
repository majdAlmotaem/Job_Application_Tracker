from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Response
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.controllers import csv_controller as controller

router = APIRouter(
    prefix="/api/csv",
    tags=["csv"]
)

@router.post("/upload", status_code=status.HTTP_200_OK)
async def upload_csv_file(file: UploadFile = File(...), table_name: str = None, db: Session = Depends(get_db)):
    """
    Uploads and parses a CSV file of job applications into a dedicated SQLite table.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a CSV file (.csv)"
        )
        
    try:
        contents = await file.read()
        csv_content = contents.decode("utf-8")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file content: {str(e)}"
        )
        
    target_table = table_name if table_name else file.filename
    result = controller.upload_csv(db, csv_content, target_table)
    return {
        "status": "success",
        "imported": result["imported"],
        "skipped": result["skipped"],
        "message": f"Import complete: {result['imported']} imported, {result['skipped']} skipped in table '{target_table}'."
    }

@router.get("/download")
def download_csv_file(table_name: str = "job_applications", db: Session = Depends(get_db)):
    """
    Exports database job applications from the specified table as a downloadable CSV file.
    """
    from backend.models.job_application import get_job_application_model
    model = get_job_application_model(table_name, db.bind)
    count = db.query(model).count()
    if count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data available in this table to export"
        )
    csv_string = controller.download_csv(db, table_name)
    
    filename = table_name
    if not filename.endswith(".csv"):
        filename += ".csv"

    # Return as an attachment file download
    return Response(
        content=csv_string,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Cache-Control": "no-cache"
        }
    )

