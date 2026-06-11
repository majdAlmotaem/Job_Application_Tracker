import os
import logging
from logging.handlers import RotatingFileHandler

def setup_logger():
    # Base directory relative to backend/utils/logger.py
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logs_dir = os.path.join(base_dir, "logs")
    
    # Ensure logs folder exists
    os.makedirs(logs_dir, exist_ok=True)
    log_file_path = os.path.join(logs_dir, "app.log")

    # Define standard format
    log_format = "%(asctime)s - %(levelname)s - %(name)s - %(message)s"
    formatter = logging.Formatter(log_format)

    # 1. Console Stream Handler
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    stream_handler.setLevel(logging.INFO)

    # 2. Rotating File Handler (Max 5MB per file, keeping 3 old backups)
    file_handler = RotatingFileHandler(
        log_file_path,
        maxBytes=5 * 1024 * 1024,
        backupCount=3,
        encoding="utf-8"
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.INFO)

    # Configure root logger
    root_logger = logging.getLogger()
    
    # Avoid adding duplicate handlers if setup_logger gets imported multiple times
    if not root_logger.handlers:
        root_logger.setLevel(logging.INFO)
        root_logger.addHandler(stream_handler)
        root_logger.addHandler(file_handler)
        
    return logging.getLogger("app")

logger = setup_logger()
