import os
import shutil
import sqlite3
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from backend.database import DB_PATH, engine

router = APIRouter(
    prefix="/api/database",
    tags=["database"]
)

@router.get("/export")
async def export_database():
    """
    Downloads the active local SQLite database file (job_tracker.db).
    """
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=404, detail="Datenbank-Datei nicht gefunden.")
    
    return FileResponse(
        path=DB_PATH,
        media_type="application/x-sqlite3",
        filename="job_tracker.db"
    )

@router.post("/import")
async def import_database(file: UploadFile = File(...)):
    """
    Uploads and replaces the active SQLite database with a backup file.
    """
    if not file.filename.endswith('.db'):
        raise HTTPException(
            status_code=400,
            detail="Ungültiges Dateiformat. Es werden nur SQLite-Datenbankdateien (.db) unterstützt."
        )

    # 1. Save uploaded file to a temporary location
    temp_path = f"{DB_PATH}.temp"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. Verify that it is a valid SQLite database
        try:
            conn = sqlite3.connect(temp_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            cursor.fetchall()
            conn.close()
        except sqlite3.Error:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise HTTPException(
                status_code=400, 
                detail="Ungültiges Datenbankformat. Die hochgeladene Datei ist keine valide SQLite-Datenbank."
            )
            
        # 3. Dispose active SQLAlchemy engine pools to release lock
        engine.dispose()
        
        # 4. Safely copy the validated file over the active DB
        shutil.copyfile(temp_path, DB_PATH)
        return {"status": "success", "message": "Datenbank erfolgreich importiert."}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Schreiben der Datenbank-Datei: {str(e)}"
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
