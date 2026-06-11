from pydantic import BaseModel
from typing import List

class CVExtractionResult(BaseModel):
    job_title: str
    location: str
    employment_type: str
    keywords: List[str]
