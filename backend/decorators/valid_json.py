import os
from functools import wraps
from fastapi import Request
from fastapi.responses import JSONResponse

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
                return JSONResponse({"success": False, "code": "invalid_json", "message": "Invalid JSON"}, status_code=400)

            missing = [f for f in required_fields if f not in data]
            if missing:
                return JSONResponse({"success": False, "code": "missing_fields", "message": "Missing required JSON fields.", "fields": missing}, status_code=400)

            request.state.json = data
            return await func(*args, **kwargs)
        return wrapper
    return decorator
