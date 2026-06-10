import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Use local SQLite database file in the backend directory
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "job_tracker.db"))
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# create_engine handles connection pooling and communication with SQLite
# connect_args={"check_same_thread": False} is required only for SQLite
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    Dependency generator for DB sessions.
    Ensures that the database session is closed after the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
