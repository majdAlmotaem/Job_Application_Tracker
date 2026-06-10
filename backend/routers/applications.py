from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from pydantic import BaseModel
from backend.database import get_db
from backend.schemas.job_application import JobApplicationResponse, JobApplicationCreate, JobApplicationUpdate
from backend.controllers import job_application as controller
from backend.models.job_application import remove_cached_model, sanitize_table_name

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
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))
        tables = [row[0] for row in result.fetchall()]
        return tables
    except Exception as e:
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
    sanitized = sanitize_table_name(table_name)
    if sanitized == "job_applications":
        try:
            db.execute(text("DELETE FROM job_applications"))
            db.commit()
            return {"status": "success", "message": "Default table job_applications cleared"}
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to clear default table: {str(e)}"
            )
    else:
        try:
            db.execute(text(f'DROP TABLE IF EXISTS "{sanitized}"'))
            db.commit()
            remove_cached_model(table_name)
            return {"status": "success", "message": f"Table {table_name} deleted from database"}
        except Exception as e:
            db.rollback()
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
    sanitized_old = sanitize_table_name(table_name)
    sanitized_new = sanitize_table_name(body.new_name)

    if sanitized_old == "job_applications":
        raise HTTPException(status_code=400, detail="Cannot rename the default table")
    if not sanitized_new:
        raise HTTPException(status_code=400, detail="Invalid new name")
    if sanitized_old == sanitized_new:
        return {"status": "success", "new_name": sanitized_new}

    try:
        db.execute(text(f'ALTER TABLE "{sanitized_old}" RENAME TO "{sanitized_new}"'))
        db.commit()
        remove_cached_model(table_name)
        return {"status": "success", "new_name": sanitized_new}
    except Exception as e:
        db.rollback()
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

