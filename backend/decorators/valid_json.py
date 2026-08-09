import os
from functools import wraps
from fastapi import Request, HTTPException
import json

def valid_json(required_fields=None):

    if required_fields is None:
        required_fields = []

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):

            request = kwargs.get("request", None)
            if request is None:
                for a in args:
                    if isinstance(a, Request):
                        request = a
                        break

            if request is None:
                raise RuntimeError("valid_json requires request!!! you should never see this unless you are dumb as fuck")

            try:
                data = await request.json()
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid JSON")

            missing = [f for f in required_fields if f not in data]
            if missing:
                raise HTTPException(status_code=422, detail=f"Missing required fields: {missing}")

            request.state.json = data
            return await func(*args, **kwargs)
        return wrapper
    return decorator
