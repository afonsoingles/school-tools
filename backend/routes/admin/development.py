from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from utils.database import Database
from tools.users import UserTools
from tools.evaluations import EvaluationTools
from tools.subjects import SubjectTools
from tools.classes import ClassTools
from utils.scheduler import scheduler
from jobs.generate_ics import generate_pending_feeds



router = APIRouter()
db = Database()
user_tools = UserTools()
evaluation_tools = EvaluationTools()
subject_tools = SubjectTools()
class_tools = ClassTools()



@router.post("/v1/admin/development/db/nuke_users_cache")
@require_auth(require_admin=True)
async def clear_users_cache(request: Request) -> JSONResponse:

    keys = []
    keys.extend(db.redis.keys("users.lookup.email:*") or [])
    keys.extend(db.redis.keys("users.user:*") or [])
    
    if keys:
        db.redis.delete(*keys)
    
    return JSONResponse({"success": True, "message": "global user cache was nuked"})

@router.post("/v1/admin/development/db/nuke_redis")
@require_auth(require_superadmin=True)
async def dev_nuke_redis(request: Request) -> JSONResponse:

    db.redis.flushdb()
    
    return JSONResponse({"success": True, "message": "redis was nuked!"})

@router.post("/v1/admin/development/calendar/force_feed_generation")
@require_auth(require_admin=True)
async def force_ics_feed_generation(request: Request) -> JSONResponse:

    scheduler.add_job(generate_pending_feeds, id="calendar.generate_pending_feeds.force", replace_existing=True)
    
    return JSONResponse({"success": True, "message": "done! triggered the job to generate pending feeds."})