from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class CVExtractionResult(BaseModel):
    job_title: str
    location: str
    employment_type: str
    keywords: List[str]

class JobSearchRequest(BaseModel):
    job_title: str
    location: str
    employment_type: str
    keywords: List[str]
    date_posted: str

class JobSearchResultItem(BaseModel):
    company: str
    job_title: str
    location: str
    url: str
    match_reason: str

class JobSearchResponse(BaseModel):
    results: List[JobSearchResultItem]

class SavedSearchBase(BaseModel):
    tab_name: str
    criteria: dict
    results: List[dict]

class SavedSearchResponse(SavedSearchBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SavedSearchUpdate(BaseModel):
    tab_name: Optional[str] = None
    criteria: Optional[dict] = None
    results: Optional[List[dict]] = None



