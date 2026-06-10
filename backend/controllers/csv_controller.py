from sqlalchemy.orm import Session
from typing import Dict, Any
from backend.models.job_application import get_job_application_model
from backend.services.csv_service import parse_csv_content, generate_csv_content, is_fuzzy_duplicate

def upload_csv(db: Session, csv_content: str, table_name: str) -> Dict[str, int]:
    """
    Parses an uploaded CSV file and inserts unique entries directly into a dedicated table.
    Skips duplicate check comparison against other tables, ensuring complete data separation.
    """
    parsed_records = parse_csv_content(csv_content)
    if not parsed_records:
        return {"imported": 0, "skipped": 0}

    # Fetch the dynamic model class for this table, creating the table if it doesn't exist
    model = get_job_application_model(table_name, db.bind)

    # We only check for duplicate records within the current upload itself to avoid inserting the same row twice
    existing_dicts = []
    imported_count = 0
    skipped_count = 0

    for record in parsed_records:
        # Check duplicate only within the new list
        is_dup = False
        for ex_dict in existing_dicts:
            if is_fuzzy_duplicate(ex_dict, record):
                is_dup = True
                break

        if is_dup:
            skipped_count += 1
        else:
            db_app = model(
                company=record["company"],
                role=record["role"],
                status=record["status"],
                date=record["date"],
                location=record["location"],
                anstellungsart=record["anstellungsart"],
                subject=record["subject"],
                summary=record["summary"],
                suggestedAction=record["suggestedAction"],
                emailId=record["emailId"],
                notes=record["notes"],
                source_file=table_name
            )
            db.add(db_app)
            existing_dicts.append({
                "company": record["company"],
                "role": record["role"],
                "location": record["location"]
            })
            imported_count += 1

    if imported_count > 0:
        db.commit()

    return {"imported": imported_count, "skipped": skipped_count}

def download_csv(db: Session, table_name: str = "job_applications") -> str:
    """
    Queries applications from the specified database table and returns a CSV formatted string.
    """
    model = get_job_application_model(table_name, db.bind)
    applications = db.query(model).order_by(model.id.desc()).all()
    return generate_csv_content(applications)

