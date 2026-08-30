from slowapi import Limiter
from slowapi.util import get_remote_address
import os

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=os.environ.get("REDIS_URL", "redis://localhost:6379"),
    enabled=True if os.environ.get("ENVIRONMENT", "development") == "development" else False
)