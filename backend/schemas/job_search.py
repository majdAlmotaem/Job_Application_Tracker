from pydantic import BaseModel
from typing import List

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

