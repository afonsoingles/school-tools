from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from utils.database import Database

router = APIRouter()
db = Database()

@router.post("/v1/admin/clear_global_user_cache")
@require_auth(require_admin=True)
async def clear_user_cache(request: Request) -> JSONResponse:
    keys = []
    keys.extend(db.redis.keys("users.lookup.email:*") or [])
    keys.extend(db.redis.keys("users.user:*") or [])

    if keys:
        db.redis.delete(*keys)

    return JSONResponse({"success": True, "message": "cleared all user cache"})