import os
import sys
import logging
from logging.handlers import TimedRotatingFileHandler

class SafeTimedRotatingFileHandler(TimedRotatingFileHandler):
    def doRollover(self):
        try:
            super().doRollover()
        except PermissionError:
            # Workaround for Windows file locking issues during uvicorn reload
            pass

def setup_logging():
    # Base directory at the workspace root (parent of backend)
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    logs_dir = os.path.join(base_dir, "logs")
    
    # Ensure logs folder exists
    os.makedirs(logs_dir, exist_ok=True)
    log_file_path = os.path.join(logs_dir, "app.log")

    # Define standard format
    log_format = "%(asctime)s | %(levelname)-8s | %(module)s:%(funcName)s:%(lineno)d - %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"
    formatter = logging.Formatter(log_format, datefmt=date_format)

    # 1. Console Stream Handler (sys.stdout) - Set to CRITICAL to keep terminal clean
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    stream_handler.setLevel(logging.CRITICAL)

    # 2. Timed Rotating File Handler (daily rotation at midnight, keeping 14 days)
    # Using delay=True prevents the uvicorn supervisor from locking the file at import time
    file_handler = SafeTimedRotatingFileHandler(
        log_file_path,
        when="midnight",
        interval=1,
        backupCount=14,
        encoding="utf-8",
        delay=True
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.DEBUG)

    # Configure root logger
    root_logger = logging.getLogger()
    
    # Clear existing handlers to prevent duplicates or uvicorn overrides
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)
        
    root_logger.setLevel(logging.DEBUG)
    root_logger.addHandler(stream_handler)
    root_logger.addHandler(file_handler)
        
    # Redirect and silence console logging for uvicorn loggers
    for logger_name in ["uvicorn", "uvicorn.error", "uvicorn.access"]:
        l = logging.getLogger(logger_name)
        l.propagate = True
        l.handlers = []
        l.setLevel(logging.DEBUG)

    # Silence spammy third-party loggers (direct to WARNING)
    for logger_name in ["watchfiles", "httpcore", "httpx", "anyio"]:
        l = logging.getLogger(logger_name)
        l.propagate = True
        l.handlers = []
        l.setLevel(logging.WARNING)
        
    app_logger = logging.getLogger("app")
    app_logger.setLevel(logging.DEBUG)
    return app_logger

logger = setup_logging()
