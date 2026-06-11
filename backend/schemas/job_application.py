from pydantic import BaseModel, field_validator
from typing import Optional

class JobApplicationBase(BaseModel):
    company: str
    role: str
    status: str
    date: str
    location: Optional[str] = None
    anstellungsart: Optional[str] = None
    subject: Optional[str] = None
    summary: Optional[str] = None
    suggestedAction: Optional[str] = None
    emailId: Optional[str] = None
    notes: Optional[str] = None
    source_file: Optional[str] = "Default"
    interview_date: Optional[str] = None

class JobApplicationCreate(JobApplicationBase):
    pass

class JobApplicationUpdate(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    date: Optional[str] = None
    location: Optional[str] = None
    anstellungsart: Optional[str] = None
    subject: Optional[str] = None
    summary: Optional[str] = None
    suggestedAction: Optional[str] = None
    emailId: Optional[str] = None
    notes: Optional[str] = None
    source_file: Optional[str] = None
    interview_date: Optional[str] = None

class JobApplicationResponse(JobApplicationBase):
    id: str

    @field_validator("id", mode="before")
    @classmethod
    def convert_id(cls, v):
        return str(v)

    class Config:
        from_attributes = True
