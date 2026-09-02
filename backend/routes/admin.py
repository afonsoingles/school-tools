from fastapi import APIRouter, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from utils.database import Database
from tools.users import UserTools
from tools.evaluations import EvaluationTools
from tools.subjects import SubjectTools
from tools.classes import ClassTools
from models.user import SafeUser
from jobs.generate_ics import generate_pending_feeds
from utils.scheduler import scheduler
from errors.base import NotFound
import uuid
import os


router = APIRouter()
db = Database()
user_tools = UserTools()
evaluation_tools = EvaluationTools()
subject_tools = SubjectTools()
class_tools = ClassTools()

@router.post("/v1/admin/force_generate_pending_feeds")
@require_auth(require_admin=True)
async def force_generate_pending_feeds(request: Request) -> JSONResponse:
    scheduler.add_job(generate_pending_feeds, id="calendar.generate_pending_feeds.force", replace_existing=True)

    return JSONResponse({"success": True, "message": "done! triggered the job to generate pending feeds."})

# Users
@router.get("/v1/admin/users")
@require_auth(require_admin=True)
async def get_users(request: Request) -> JSONResponse:
    limit = int(request.query_params.get("limit", 100))
    offset = int(request.query_params.get("offset", 0))

    users = user_tools.get_users(limit=limit, offset=offset)
    safe_users = [SafeUser.model_validate(user) for user in users]

    return JSONResponse({"success": True, "users": [user.model_dump(mode="json") for user in safe_users]})

@router.get("/v1/admin/users/{user_id}")
@require_auth(require_admin=True)
async def get_user(request: Request, user_id: str) -> JSONResponse:
    user_uuid = uuid.UUID(user_id)
    user = user_tools.get_user_by_id(user_id)
    classes = class_tools.get_user_class_schedule(user_uuid)
    cancelled_classes = class_tools.get_user_cancelled_classes(user_uuid)
    evaluations = evaluation_tools.get_user_evaluations(user_uuid)
    subjects = subject_tools.get_user_subjects(user_uuid)

    safe_user = SafeUser.model_validate(user)

    return JSONResponse(jsonable_encoder({"success": True, "user": safe_user.model_dump(mode="json"), "classes": classes, "cancelled_classes": cancelled_classes, "evaluations": evaluations, "subjects": subjects}))

@router.patch("/v1/admin/users/{user_id}")
@require_auth(require_admin=True)
async def update_user(request: Request, user_id: str) -> JSONResponse:
    data = await request.json()
    user = user_tools.update_user(uuid.UUID(user_id), **data)

    safe_user = SafeUser.model_validate(user)

    return JSONResponse({"success": True, "user": safe_user.model_dump(mode="json")})

@router.post("/v1/admin/users/{user_id}/resend_verification_email")
@require_auth(require_admin=True)
async def resend_verification_email(request: Request, user_id: str) -> JSONResponse:
    user = user_tools.get_user_by_id(user_id)
    user_tools.send_verification_link(user.id, user.name, user.email)

    return JSONResponse({"success": True, "message": "done! sent them a link to their email!"})

# Development ONLY.

def _is_dev() -> bool:
    return os.environ.get("ENVIRONMENT") == "development"

@router.post("/v1/admin/dev/clear_global_user_cache")
@require_auth(require_admin=True)
async def dev_clear_user_cache(request: Request) -> JSONResponse:
    if not _is_dev():
        raise NotFound

    keys = []
    keys.extend(db.redis.keys("users.lookup.email:*") or [])
    keys.extend(db.redis.keys("users.user:*") or [])
    
    if keys:
        db.redis.delete(*keys)
    
    return JSONResponse({"success": True, "message": "user cache went kaboom!"})

@router.post("/v1/admin/dev/nuke_redis")
@require_auth(require_admin=True)
async def dev_nuke_redis(request: Request) -> JSONResponse:
    if not _is_dev():
        raise NotFound
    
    db.redis.flushdb()
    
    return JSONResponse({"success": True, "message": "redis was nuked!"})