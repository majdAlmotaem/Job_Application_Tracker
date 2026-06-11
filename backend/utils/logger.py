import os
import logging
from logging.handlers import RotatingFileHandler

def setup_logger():
    # Base directory at the workspace root (parent of backend)
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    logs_dir = os.path.join(base_dir, "logs")
    
    # Ensure logs folder exists
    os.makedirs(logs_dir, exist_ok=True)
    log_file_path = os.path.join(logs_dir, "app.log")

    # Define standard format
    log_format = "%(asctime)s - %(levelname)s - %(name)s - %(message)s"
    formatter = logging.Formatter(log_format)

    # 1. Console Stream Handler (Only log CRITICAL events to console to avoid duplication with app.log)
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    stream_handler.setLevel(logging.CRITICAL)

    # 2. Rotating File Handler (Max 5MB per file, keeping 3 old backups)
    file_handler = RotatingFileHandler(
        log_file_path,
        maxBytes=5 * 1024 * 1024,
        backupCount=3,
        encoding="utf-8"
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.DEBUG)

    # Configure root logger
    root_logger = logging.getLogger()
    
    # Avoid adding duplicate handlers if setup_logger gets imported multiple times
    if not root_logger.handlers:
        root_logger.setLevel(logging.DEBUG)
        root_logger.addHandler(stream_handler)
        root_logger.addHandler(file_handler)
        
    # Silence spammy third-party loggers
    logging.getLogger("watchfiles").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("anyio").setLevel(logging.WARNING)
        
    app_logger = logging.getLogger("app")
    app_logger.setLevel(logging.DEBUG)
    return app_logger

logger = setup_logger()
