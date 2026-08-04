import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from backend.models.job_application import (
    JobApplicationModel,
    get_job_application_model,
    remove_cached_model,
    sanitize_table_name
)
from backend.schemas.job_application import JobApplicationCreate, JobApplicationUpdate

logger = logging.getLogger(__name__)

def get_applications(db: Session, table_name: str = "job_applications") -> List[Any]:
    """
    Retrieves all job applications from the database for the specified table, ordered by ID descending.
    """
    model = get_job_application_model(table_name, db.bind)
    apps = db.query(model).order_by(model.id.desc()).all()
    logger.debug(f"📂 [DB] Fetched {len(apps)} applications from table '{table_name}'.")
    return apps

def create_application(db: Session, app_data: JobApplicationCreate, table_name: str = "job_applications") -> Any:
    """
    Creates a new job application record in the specified database table.
    """
    model = get_job_application_model(table_name, db.bind)
    logger.info(
        f"📂 [DB] Creating new application in table '{table_name}': "
        f"Company='{app_data.company}', Role='{app_data.role}', Stage='{app_data.stage}', Status='{app_data.status}', emailId='{app_data.emailId}'"
    )
    db_app = model(
        company=app_data.company,
        role=app_data.role,
        stage=app_data.stage,
        status=app_data.status,
        date=app_data.date,
        location=app_data.location,
        anstellungsart=app_data.anstellungsart,
        subject=app_data.subject,
        summary=app_data.summary,
        suggestedAction=app_data.suggestedAction,
        emailId=app_data.emailId,
        notes=app_data.notes,
        source_file=app_data.source_file if app_data.source_file else table_name,
        interview_date=app_data.interview_date,
        interview_time=app_data.interview_time,
        interview_note=app_data.interview_note
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    logger.info(f"📂 [DB] Successfully created application ID={db_app.id} in table '{table_name}'.")
    return db_app

def update_application(db: Session, app_id: int, app_data: JobApplicationUpdate, table_name: str = "job_applications") -> Any:
    """
    Updates an existing job application record in the specified database table.
    """
    model = get_job_application_model(table_name, db.bind)
    db_app = db.query(model).filter(model.id == app_id).first()
    if not db_app:
        logger.warning(f"📂 [DB] Update failed: Application ID={app_id} not found in table '{table_name}'.")
        return None

    update_dict = app_data.model_dump(exclude_unset=True)
    logger.info(f"📂 [DB] Updating application ID={app_id} in table '{table_name}'. Changes: {update_dict}")
    logger.info(f"📂 [DB] Before Update: Company='{db_app.company}', Role='{db_app.role}', Stage='{db_app.stage}', Status='{db_app.status}'")
    
    for key, value in update_dict.items():
        setattr(db_app, key, value)

    db.commit()
    db.refresh(db_app)
    logger.info(f"📂 [DB] Successfully updated application ID={app_id} in table '{table_name}'. After Update: Stage='{db_app.stage}', Status='{db_app.status}'")
    return db_app

def delete_application(db: Session, app_id: int, table_name: str = "job_applications") -> bool:
    """
    Deletes a single job application record by ID from the specified database table.
    """
    model = get_job_application_model(table_name, db.bind)
    db_app = db.query(model).filter(model.id == app_id).first()
    if not db_app:
        logger.warning(f"📂 [DB] Delete failed: Application ID={app_id} not found in table '{table_name}'.")
        return False
        
    logger.info(f"📂 [DB] Deleting application ID={app_id} in table '{table_name}': Company='{db_app.company}', Role='{db_app.role}'")
    db.delete(db_app)
    db.commit()
    logger.info(f"📂 [DB] Successfully deleted application ID={app_id} from table '{table_name}'.")
    return True

def bulk_delete_applications(db: Session, app_ids: List[int], table_name: str = "job_applications") -> int:
    """
    Bulk deletes multiple job applications by ID from the specified database table. Returns the count of deleted rows.
    """
    if not app_ids:
        return 0
        
    model = get_job_application_model(table_name, db.bind)
    logger.info(f"📂 [DB] Bulk deleting application IDs={app_ids} in table '{table_name}'")
    deleted_count = db.query(model).filter(model.id.in_(app_ids)).delete(synchronize_session=False)
    db.commit()
    logger.info(f"📂 [DB] Successfully bulk deleted {deleted_count} applications from table '{table_name}'.")
    return deleted_count

def get_tables(db: Session) -> List[str]:
    """
    Returns the list of all available user tables in the SQLite database.
    """
    result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'saved_searches'"))
    tables = [row[0] for row in result.fetchall()]
    return tables

def delete_table(db: Session, table_name: str) -> Dict[str, str]:
    """
    Drops the specified table from the SQLite database. If it's the default 'job_applications'
    table, clears all its records instead of dropping it.
    """
    sanitized = sanitize_table_name(table_name)
    if sanitized == "job_applications":
        try:
            logger.info("📂 [DB] Request to clear default table 'job_applications'")
            db.execute(text("DELETE FROM job_applications"))
            db.commit()
            logger.info("📂 [DB] Successfully cleared default table 'job_applications'")
            return {"status": "success", "message": "Default table job_applications cleared"}
        except Exception as e:
            db.rollback()
            logger.error(f"📂 [DB] Failed to clear default table 'job_applications': {e}", exc_info=True)
            raise e
    else:
        try:
            logger.info(f"📂 [DB] Request to drop table '{table_name}' (sanitized to '{sanitized}')")
            db.execute(text(f'DROP TABLE IF EXISTS "{sanitized}"'))
            db.commit()
            remove_cached_model(table_name)
            logger.info(f"📂 [DB] Successfully dropped table '{table_name}'")
            return {"status": "success", "message": f"Table {table_name} deleted from database"}
        except Exception as e:
            db.rollback()
            logger.error(f"📂 [DB] Failed to drop table '{table_name}': {e}", exc_info=True)
            raise e

def rename_table(db: Session, table_name: str, new_name: str) -> Dict[str, str]:
    """
    Renames a custom user table via ALTER TABLE ... RENAME TO ...
    The default 'job_applications' table cannot be renamed.
    """
    sanitized_old = sanitize_table_name(table_name)
    sanitized_new = sanitize_table_name(new_name)

    logger.info(f"📂 [DB] Request to rename table '{table_name}' to '{new_name}'")

    if sanitized_old == "job_applications":
        logger.warning("📂 [DB] Rename aborted: Cannot rename the default table 'job_applications'")
        raise ValueError("Cannot rename the default table")
    if not sanitized_new:
        logger.warning(f"📂 [DB] Rename aborted: Invalid new name '{new_name}'")
        raise ValueError("Invalid new name")
    if sanitized_old == sanitized_new:
        logger.info(f"📂 [DB] Rename bypassed: Old name matches new name ('{sanitized_old}')")
        return {"status": "success", "new_name": sanitized_new}

    try:
        db.execute(text(f'ALTER TABLE "{sanitized_old}" RENAME TO "{sanitized_new}"'))
        db.commit()
        remove_cached_model(table_name)
        logger.info(f"📂 [DB] Successfully renamed table '{sanitized_old}' to '{sanitized_new}'")
        return {"status": "success", "new_name": sanitized_new}
    except Exception as e:
        db.rollback()
        logger.error(f"📂 [DB] Failed to rename table '{sanitized_old}' to '{sanitized_new}': {e}", exc_info=True)
        raise e

