from sqlalchemy.orm import Session
from typing import List, Dict, Any
from backend.models.job_application import JobApplicationModel, get_job_application_model
from backend.schemas.job_application import JobApplicationCreate, JobApplicationUpdate

def get_applications(db: Session, table_name: str = "job_applications") -> List[Any]:
    """
    Retrieves all job applications from the database for the specified table, ordered by ID descending.
    """
    model = get_job_application_model(table_name, db.bind)
    return db.query(model).order_by(model.id.desc()).all()

def create_application(db: Session, app_data: JobApplicationCreate, table_name: str = "job_applications") -> Any:
    """
    Creates a new job application record in the specified database table.
    """
    model = get_job_application_model(table_name, db.bind)
    db_app = model(
        company=app_data.company,
        role=app_data.role,
        status=app_data.status,
        date=app_data.date,
        location=app_data.location,
        anstellungsart=app_data.anstellungsart,
        subject=app_data.subject,
        summary=app_data.summary,
        suggestedAction=app_data.suggestedAction,
        emailId=app_data.emailId,
        notes=app_data.notes,
        source_file=app_data.source_file if app_data.source_file else table_name
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app

def update_application(db: Session, app_id: int, app_data: JobApplicationUpdate, table_name: str = "job_applications") -> Any:
    """
    Updates an existing job application record in the specified database table.
    """
    model = get_job_application_model(table_name, db.bind)
    db_app = db.query(model).filter(model.id == app_id).first()
    if not db_app:
        return None

    update_dict = app_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(db_app, key, value)

    db.commit()
    db.refresh(db_app)
    return db_app

def delete_application(db: Session, app_id: int, table_name: str = "job_applications") -> bool:
    """
    Deletes a single job application record by ID from the specified database table.
    """
    model = get_job_application_model(table_name, db.bind)
    db_app = db.query(model).filter(model.id == app_id).first()
    if not db_app:
        return False
        
    db.delete(db_app)
    db.commit()
    return True

def bulk_delete_applications(db: Session, app_ids: List[int], table_name: str = "job_applications") -> int:
    """
    Bulk deletes multiple job applications by ID from the specified database table. Returns the count of deleted rows.
    """
    if not app_ids:
        return 0
        
    model = get_job_application_model(table_name, db.bind)
    deleted_count = db.query(model).filter(model.id.in_(app_ids)).delete(synchronize_session=False)
    db.commit()
    return deleted_count

