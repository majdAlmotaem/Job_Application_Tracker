import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Trigger SQLite database migrations / table creation
from backend.database import Base, engine
from backend.models.job_application import JobApplicationModel
from backend.models.saved_search import SavedSearchModel
Base.metadata.create_all(bind=engine)

# Dynamically run schema migration to add source_file and interview_date columns if they don't exist
from sqlalchemy import inspect, text
inspector = inspect(engine)
for table_name in inspector.get_table_names():
    if not table_name.startswith("sqlite_"):
        columns = [col["name"] for col in inspector.get_columns(table_name)]
        if "source_file" not in columns and table_name == "job_applications":
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE job_applications ADD COLUMN source_file VARCHAR DEFAULT 'Default'"))
        if "interview_date" not in columns and table_name != "saved_searches":
            with engine.begin() as conn:
                conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN interview_date TEXT'))


import time
from backend.utils.logger import logger

# Import Routers
from backend.routers.applications import router as applications_router
from backend.routers.csv import router as csv_router
from backend.routers.emails import router as emails_router
from backend.routers.job_search import router as job_search_router, searches_router

app = FastAPI(
    title="Job Application Tracker API",
    description="Python FastAPI backend migrating away from Express & Google Sheets to local SQLite database",
    version="1.0.0"
)

# CORS configuration to support direct front-end calls if proxy is bypassed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development ease
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = (time.perf_counter() - start_time) * 1000
    
    logger.info(
        f"Request: {request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Duration: {process_time:.2f}ms"
    )
    return response

# Mount API Routers
app.include_router(applications_router)
app.include_router(csv_router)
app.include_router(emails_router)
app.include_router(job_search_router)
app.include_router(searches_router)

# Production Static File Serving (Vite build folder: dist)
dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../dist"))
if os.path.exists(dist_path):
    # Serve assets folder
    assets_path = os.path.join(dist_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
    
    # Root route serves index.html
    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(dist_path, "index.html"))

    # Catch-all route to serve index.html for client-side routing (Vite SPA)
    @app.get("/{catchall:path}")
    async def serve_frontend(catchall: str):
        # Prevent masking 404 API calls
        if catchall.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        
        index_file = os.path.join(dist_path, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Index file not found")
else:
    @app.get("/")
    def read_root():
        return {"status": "running", "environment": "development", "message": "FastAPI is running. Frontend dev server should be run separately via Vite."}
