from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from utils.database import Database

router = APIRouter()
db = Database()

@router.post("/v1/admin/clear_global_user_cache")
@require_auth(require_admin=True)
async def clear_user_cache(request: Request) -> JSONResponse:
    db.redis.delete("users.lookup.email:*")
    db.redis.delete("users.user:*")

    return JSONResponse({"success": True, "message": "cleared all user cache"})