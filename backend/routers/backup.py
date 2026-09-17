import os
import shutil
import sqlite3
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import FileResponse
from backend.database import DB_PATH, engine

router = APIRouter(
    prefix="/api/database",
    tags=["database"]
)

ALLOWED_HOSTS = {"127.0.0.1", "::1", "localhost", "testclient"}
MAX_DB_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
SQLITE_HEADER_MAGIC = b"SQLite format 3\x00"

def _ensure_local_access(request: Request):
    client_host = request.client.host if request.client else None
    if client_host not in ALLOWED_HOSTS:
        raise HTTPException(
            status_code=403,
            detail="Zugriff verweigert: Datenbank-Export und -Import sind nur lokal auf dem Host gestattet."
        )

@router.get("/export")
async def export_database(request: Request):
    """
    Downloads the active local SQLite database file (job_tracker.db).
    Restricted to local host requests.
    """
    _ensure_local_access(request)

    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=404, detail="Datenbank-Datei nicht gefunden.")
    
    return FileResponse(
        path=DB_PATH,
        media_type="application/x-sqlite3",
        filename="job_tracker.db"
    )

@router.post("/import")
async def import_database(request: Request, file: UploadFile = File(...)):
    """
    Uploads and replaces the active SQLite database with a backup file.
    Restricted to local host requests with strict size and SQLite format checks.
    """
    _ensure_local_access(request)

    if not file.filename or not file.filename.endswith('.db'):
        raise HTTPException(
            status_code=400,
            detail="Ungültiges Dateiformat. Es werden nur SQLite-Datenbankdateien (.db) unterstützt."
        )

    temp_path = f"{DB_PATH}.temp"
    try:
        # 1. Read file with strict size limit (chunked)
        bytes_read = 0
        with open(temp_path, "wb") as buffer:
            header_checked = False
            while chunk := await file.read(64 * 1024):  # 64KB chunks
                bytes_read += len(chunk)
                if bytes_read > MAX_DB_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="Die Datenbankdatei überschreitet die maximale Größe von 50 MB."
                    )
                if not header_checked:
                    if len(chunk) < 16 or not chunk.startswith(SQLITE_HEADER_MAGIC):
                        raise HTTPException(
                            status_code=400,
                            detail="Ungültiges Datenbankformat. Datei enthält keinen gültigen SQLite-Header."
                        )
                    header_checked = True
                buffer.write(chunk)
            
        # 2. Verify that it is an intact SQLite database with table inspection
        try:
            conn = sqlite3.connect(temp_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            conn.close()
            if not tables:
                raise HTTPException(
                    status_code=400,
                    detail="Die hochgeladene SQLite-Datenbank enthält keine Tabellen."
                )
        except sqlite3.Error:
            raise HTTPException(
                status_code=400, 
                detail="Ungültiges Datenbankformat. Die hochgeladene Datei ist beschädigt oder keine valide SQLite-Datenbank."
            )
            
        # 3. Dispose active SQLAlchemy engine pools to release lock
        engine.dispose()
        
        # 4. Safely copy the validated file over the active DB
        shutil.copyfile(temp_path, DB_PATH)
        return {"status": "success", "message": "Datenbank erfolgreich importiert."}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Schreiben der Datenbank-Datei: {str(e)}"
        )
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
