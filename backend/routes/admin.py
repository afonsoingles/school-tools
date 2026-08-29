from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from utils.database import Database
from jobs.generate_ics import generate_pending_feeds
from main import scheduler

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

@router.post("/v1/admin/force_generate_pending_feeds")
@require_auth(require_admin=True)
async def force_generate_pending_feeds(request: Request) -> JSONResponse:
    scheduler.add_job(generate_pending_feeds, id="calendar.generate_pending_feeds")

    return JSONResponse({"success": True, "message": "done! triggered the job to generate pending feeds."})