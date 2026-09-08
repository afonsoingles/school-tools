import os

def is_dev() -> bool:
    return os.environ.get("ENVIRONMENT") == "development"