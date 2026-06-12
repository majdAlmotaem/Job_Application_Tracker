from sqlalchemy import Column, Integer, String, JSON, DateTime
from datetime import datetime
from backend.database import Base

class SavedSearchModel(Base):
    __tablename__ = "saved_searches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tab_name = Column(String, nullable=False)
    criteria = Column(JSON, nullable=False)
    results = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
