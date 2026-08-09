import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Hier importierst du deine FastAPI-App und die Base für die Datenbank
from backend.main import app 
from backend.database import Base, get_db

# 1. In-Memory SQLite Datenbank (existiert nur im Arbeitsspeicher)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 2. Tabellen vor jedem Test neu erstellen
Base.metadata.create_all(bind=engine)

# 3. Dependency Override: FastAPI sagen, dass es die Test-DB nutzen soll
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# 4. Den TestClient bereitstellen
@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c