import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from backend.database import get_db
from backend.schemas.job_application import JobApplicationResponse, JobApplicationCreate, JobApplicationUpdate
from backend.controllers import job_application as controller

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/applications",
    tags=["applications"]
)

class BulkDeleteRequest(BaseModel):
    ids: List[str]  # Accepts string IDs to maintain compatibility with frontend typing

@router.get("/tables", response_model=List[str])
def read_tables(db: Session = Depends(get_db)):
    """
    Returns the list of all available user tables in the SQLite database.
    """
    try:
        return controller.get_tables(db)
    except Exception as e:
        logger.error(f"Failed to fetch tables: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch tables: {str(e)}"
        )

@router.delete("/tables/{table_name}", status_code=status.HTTP_200_OK)
def delete_table(table_name: str, db: Session = Depends(get_db)):
    """
    Drops the specified table from the SQLite database. If it's the default 'job_applications'
    table, clears all its records instead of dropping it.
    """
    try:
        return controller.delete_table(db, table_name)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete table {table_name}: {str(e)}"
        )

class RenameTableRequest(BaseModel):
    new_name: str

@router.put("/tables/{table_name}", status_code=status.HTTP_200_OK)
def rename_table(table_name: str, body: RenameTableRequest, db: Session = Depends(get_db)):
    """
    Renames a custom user table via ALTER TABLE ... RENAME TO ...
    The default 'job_applications' table cannot be renamed.
    """
    try:
        return controller.rename_table(db, table_name, body.new_name)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rename table: {str(e)}"
        )

@router.get("", response_model=List[JobApplicationResponse])
def read_applications(table_name: str = "job_applications", db: Session = Depends(get_db)):
    """
    Returns all job applications from the specified table.
    """
    return controller.get_applications(db, table_name)

@router.post("", response_model=JobApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(app_data: JobApplicationCreate, table_name: str = "job_applications", db: Session = Depends(get_db)):
    """
    Creates a new job application in the specified table.
    """
    return controller.create_application(db, app_data, table_name)

@router.put("/{app_id}", response_model=JobApplicationResponse)
def update_application(app_id: str, app_data: JobApplicationUpdate, table_name: str = "job_applications", db: Session = Depends(get_db)):
    """
    Updates an existing job application in the specified table.
    """
    try:
        int_id = int(app_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application ID must be an integer"
        )
        
    db_app = controller.update_application(db, int_id, app_data, table_name)
    if not db_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    return db_app

@router.delete("/{app_id}", status_code=status.HTTP_200_OK)
def delete_application(app_id: str, table_name: str = "job_applications", db: Session = Depends(get_db)):
    """
    Deletes a single job application from the specified table.
    """
    try:
        int_id = int(app_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application ID must be an integer"
        )
        
    success = controller.delete_application(db, int_id, table_name)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    return {"status": "success", "message": f"Application {app_id} deleted"}

@router.post("/delete", status_code=status.HTTP_200_OK)
def bulk_delete_applications(request: BulkDeleteRequest, table_name: str = "job_applications", db: Session = Depends(get_db)):
    """
    Deletes multiple job applications in a single request from the specified table.
    """
    int_ids = []
    for app_id in request.ids:
        try:
            int_ids.append(int(app_id))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Application ID '{app_id}' must be an integer representation"
            )
            
    deleted_count = controller.bulk_delete_applications(db, int_ids, table_name)
    return {
        "status": "success",
        "deleted_count": deleted_count,
        "message": f"Successfully deleted {deleted_count} applications"
    }

