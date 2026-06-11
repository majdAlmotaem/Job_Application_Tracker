from sqlalchemy import Column, Integer, String, Text
from backend.database import Base

class JobApplicationModel(Base):
    """
    SQLAlchemy model representing a Job Application record in SQLite.
    """
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Maps to jobtitle/role
    status = Column(String, nullable=False, default="Applied")
    date = Column(String, nullable=False)  # Maps to applicationdate
    location = Column(String, nullable=True)
    anstellungsart = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    summary = Column(String, nullable=True)
    suggestedAction = Column(String, nullable=True)
    emailId = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    source_file = Column(String, nullable=True, default="Default")


import re

# Cache dictionary to avoid duplicate SQLAlchemy mapper warnings/errors
_dynamic_models = {}

def sanitize_table_name(name: str) -> str:
    """
    Sanitizes the table name to be a valid SQLite database identifier.
    Only allows letters, numbers, and underscores, converting it to lowercase.
    """
    if not name:
        return "job_applications"
    
    # Strip extensions like .csv
    if name.lower().endswith(".csv"):
        name = name[:-4]
        
    sanitized = re.sub(r"[^a-zA-Z0-9_]", "_", name)
    if not sanitized:
        return "job_applications"
        
    # SQL identifiers cannot start with a number
    if sanitized[0].isdigit():
        sanitized = "_" + sanitized
        
    return sanitized.lower()

def get_job_application_model(table_name: str, bind=None):
    """
    Dynamically constructs a SQLAlchemy model class for a specific table name.
    If the table does not exist in SQLite, it will automatically be created.
    """
    sanitized = sanitize_table_name(table_name)
    
    if sanitized in _dynamic_models:
        model_cls = _dynamic_models[sanitized]
        if bind:
            model_cls.__table__.create(bind=bind, checkfirst=True)
        return model_cls
        
    if sanitized == "job_applications":
        _dynamic_models[sanitized] = JobApplicationModel
        if bind:
            JobApplicationModel.__table__.create(bind=bind, checkfirst=True)
        return JobApplicationModel

    class DynamicJobApplication(Base):
        __tablename__ = sanitized
        __table_args__ = {'extend_existing': True}

        id = Column(Integer, primary_key=True, index=True, autoincrement=True)
        company = Column(String, nullable=False)
        role = Column(String, nullable=False)
        status = Column(String, nullable=False, default="Applied")
        date = Column(String, nullable=False)
        location = Column(String, nullable=True)
        anstellungsart = Column(String, nullable=True)
        subject = Column(String, nullable=True)
        summary = Column(String, nullable=True)
        suggestedAction = Column(String, nullable=True)
        emailId = Column(String, nullable=True)
        notes = Column(Text, nullable=True)
        source_file = Column(String, nullable=True, default=table_name)

    _dynamic_models[sanitized] = DynamicJobApplication
    
    if bind:
        DynamicJobApplication.__table__.create(bind=bind, checkfirst=True)
        
    return DynamicJobApplication

def remove_cached_model(table_name: str):
    """
    Removes a dynamically generated model class from the local cache and the
    SQLAlchemy metadata registry to avoid mapping collisions if the table is recreated.
    """
    sanitized = sanitize_table_name(table_name)
    model = _dynamic_models.pop(sanitized, None)
    if model and hasattr(model, "__table__"):
        try:
            Base.metadata.remove(model.__table__)
        except Exception:
            pass
