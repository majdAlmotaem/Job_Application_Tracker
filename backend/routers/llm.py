import logging
import ipaddress
from urllib.parse import urlparse
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.llm_provider import LLMProviderModel
from backend.services.llm.dispatcher import LLMConfig, test_provider_connection
from backend.services.llm.ollama_client import fetch_ollama_models
from backend.services.llm.gemini_client import fetch_gemini_models

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/llm",
    tags=["llm"]
)

def validate_base_url(url: Optional[str]) -> None:
    """
    Validates base_url to prevent SSRF against link-local/cloud metadata endpoints.
    """
    if not url:
        return
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ungültiges URL-Schema. Nur http:// und https:// sind erlaubt."
        )
    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ungültige URL: Kein Hostname angegeben."
        )
    
    blocked_hosts = {"metadata.google.internal", "metadata", "instance-data"}
    if hostname.lower() in blocked_hosts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zugriff auf Cloud-Metadaten-Endpunkte ist nicht gestattet."
        )
        
    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_link_local or ip.is_multicast or ip.is_unspecified or str(ip) == "169.254.169.254":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Zugriff auf Adresse {hostname} ist aus Sicherheitsgründen nicht gestattet."
            )
    except ValueError:
        pass

def mask_key(key: Optional[str]) -> Optional[str]:
    if not key:
        return None
    if len(key) <= 8:
        return "********"
    return f"{key[:4]}...{key[-4:]}"

class ProviderCreatePayload(BaseModel):
    name: str
    provider_type: str  # 'ollama' | 'gemini' | 'openai'
    model_name: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    is_default: bool = False

class ProviderResponse(BaseModel):
    id: int
    name: str
    provider_type: str
    model_name: str
    masked_api_key: Optional[str] = None
    base_url: Optional[str] = None
    is_default: bool

    class Config:
        from_attributes = True

@router.get("/providers", response_model=List[ProviderResponse])
def get_providers(db: Session = Depends(get_db)):
    """
    Returns list of configured LLM providers with masked API keys.
    """
    providers = db.query(LLMProviderModel).order_by(LLMProviderModel.is_default.desc(), LLMProviderModel.id.asc()).all()
    return [
        ProviderResponse(
            id=p.id,
            name=p.name,
            provider_type=p.provider_type,
            model_name=p.model_name,
            masked_api_key=mask_key(p.api_key),
            base_url=p.base_url,
            is_default=p.is_default
        )
        for p in providers
    ]

@router.post("/providers", response_model=ProviderResponse, status_code=status.HTTP_201_CREATED)
def create_provider(payload: ProviderCreatePayload, db: Session = Depends(get_db)):
    """
    Saves a new LLM provider configuration.
    """
    validate_base_url(payload.base_url)

    api_key = payload.api_key
    if api_key:
        api_key = api_key.strip()
    
    # If the user didn't enter a key for gemini/openai, check if another provider of the same type has one
    if not api_key and payload.provider_type in ["gemini", "openai"]:
        existing_with_key = db.query(LLMProviderModel).filter(
            LLMProviderModel.provider_type == payload.provider_type,
            LLMProviderModel.api_key.isnot(None),
            LLMProviderModel.api_key != ""
        ).first()
        if existing_with_key and existing_with_key.api_key:
            api_key = existing_with_key.api_key

    existing_count = db.query(LLMProviderModel).count()
    should_be_default = payload.is_default or existing_count == 0

    try:
        if should_be_default:
            db.query(LLMProviderModel).update({LLMProviderModel.is_default: False})

        new_provider = LLMProviderModel(
            name=payload.name,
            provider_type=payload.provider_type,
            model_name=payload.model_name,
            api_key=api_key,
            base_url=payload.base_url,
            is_default=should_be_default
        )
        db.add(new_provider)
        db.commit()
        db.refresh(new_provider)
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create provider: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Speichern der Modellkonfiguration.")

    return ProviderResponse(
        id=new_provider.id,
        name=new_provider.name,
        provider_type=new_provider.provider_type,
        model_name=new_provider.model_name,
        masked_api_key=mask_key(new_provider.api_key),
        base_url=new_provider.base_url,
        is_default=new_provider.is_default
    )

class UpdateProviderPayload(BaseModel):
    name: Optional[str] = None
    model_name: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    is_default: Optional[bool] = None

@router.patch("/providers/{provider_id}", response_model=ProviderResponse)
def update_provider(provider_id: int, payload: UpdateProviderPayload, db: Session = Depends(get_db)):
    """
    Updates an existing provider (e.g. changing model_name) without requiring the API key again.
    """
    if payload.base_url is not None:
        validate_base_url(payload.base_url)

    provider = db.query(LLMProviderModel).filter(LLMProviderModel.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Modell-Konfiguration nicht gefunden")

    try:
        if payload.name is not None:
            provider.name = payload.name
        if payload.model_name is not None:
            provider.model_name = payload.model_name
        if payload.base_url is not None:
            provider.base_url = payload.base_url
        if payload.api_key is not None and "****" not in payload.api_key and payload.api_key.strip():
            provider.api_key = payload.api_key.strip()
        if payload.is_default is True:
            db.query(LLMProviderModel).update({LLMProviderModel.is_default: False})
            provider.is_default = True

        db.commit()
        db.refresh(provider)
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update provider: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Aktualisieren der Modellkonfiguration.")

    return ProviderResponse(
        id=provider.id,
        name=provider.name,
        provider_type=provider.provider_type,
        model_name=provider.model_name,
        masked_api_key=mask_key(provider.api_key),
        base_url=provider.base_url,
        is_default=provider.is_default
    )

@router.delete("/providers/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_provider(provider_id: int, db: Session = Depends(get_db)):
    """
    Deletes an LLM provider and reassigns default if necessary.
    """
    provider = db.query(LLMProviderModel).filter(LLMProviderModel.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Modell-Konfiguration nicht gefunden")

    try:
        was_default = provider.is_default
        db.delete(provider)
        db.commit()

        if was_default:
            first_remaining = db.query(LLMProviderModel).first()
            if first_remaining:
                first_remaining.is_default = True
                db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete provider: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Löschen der Modellkonfiguration.")

    return None

@router.post("/providers/{provider_id}/set-default")
def set_default_provider(provider_id: int, db: Session = Depends(get_db)):
    """
    Sets the specified provider as active default.
    """
    provider = db.query(LLMProviderModel).filter(LLMProviderModel.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Modell-Konfiguration nicht gefunden")

    try:
        db.query(LLMProviderModel).update({LLMProviderModel.is_default: False})
        provider.is_default = True
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to set default provider: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Festlegen des Standardmodells.")

    return {"status": "ok", "default_id": provider_id}

@router.get("/ollama/models")
async def get_ollama_models(base_url: str = "http://localhost:11434"):
    """
    Discovers installed Ollama models without frontend CORS restrictions.
    """
    validate_base_url(base_url)
    try:
        models = await fetch_ollama_models(base_url)
        return {"models": models}
    except Exception as e:
        logger.warning(f"Failed to reach Ollama at {base_url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ollama unter {base_url} nicht erreichbar. Stellen Sie sicher, dass Ollama läuft ('ollama serve')."
        )

@router.post("/ollama/unload")
async def unload_ollama(base_url: str = "http://localhost:11434"):
    """
    Unloads all currently loaded models from Ollama to immediately free system RAM.
    """
    validate_base_url(base_url)
    from backend.services.llm.ollama_client import unload_ollama_models
    await unload_ollama_models(base_url)
    return {"status": "ok", "message": "Ollama-Modelle erfolgreich aus dem Arbeitsspeicher entladen"}

@router.get("/gemini/models")
async def get_gemini_models(api_key: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Fetches available Gemini generation models for the user's API key.
    """
    key = api_key
    if not key or "****" in key:
        saved = db.query(LLMProviderModel).filter(LLMProviderModel.provider_type == "gemini").first()
        if saved and saved.api_key:
            key = saved.api_key

    if not key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bitte geben Sie zuerst einen Gemini API-Key ein, um Modelle abzurufen."
        )

    try:
        models = await fetch_gemini_models(key)
        return {"models": models}
    except Exception as e:
        logger.warning(f"Failed to fetch Gemini models: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gemini-Modelle konnten nicht abgerufen werden: {str(e)}"
        )

class TestPayload(BaseModel):
    provider_type: str
    model_name: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None

@router.post("/test")
async def test_llm(payload: TestPayload, db: Session = Depends(get_db)):
    """
    Tests live connection to an LLM provider with credentials before saving.
    """
    if payload.base_url:
        validate_base_url(payload.base_url)

    api_key = payload.api_key
    # If key is masked or empty, check if we have a saved provider with this key
    if not api_key or "****" in api_key:
        saved = db.query(LLMProviderModel).filter(
            LLMProviderModel.provider_type == payload.provider_type,
            LLMProviderModel.api_key.isnot(None)
        ).first()
        if saved and saved.api_key:
            api_key = saved.api_key

    config = LLMConfig(
        provider_type=payload.provider_type, # type: ignore
        model_name=payload.model_name,
        api_key=api_key,
        base_url=payload.base_url
    )
    try:
        result = await test_provider_connection(config)
        return {"success": True, "message": "Verbindung erfolgreich!", "details": result}
    except Exception as e:
        logger.error(f"LLM test connection failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Verbindungstest fehlgeschlagen: {str(e)}"
        )
