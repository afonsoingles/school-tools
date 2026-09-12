from fastapi import APIRouter, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from decorators.valid_json import valid_json
from utils.database import Database
from tools.users import UserTools
from tools.evaluations import EvaluationTools
from tools.subjects import SubjectTools
from tools.classes import ClassTools
from models.user import *
from errors.user import UserNotFoundError
from errors.admin import AdminInvalidContentType
import json
import uuid


router = APIRouter()
db = Database()
user_tools = UserTools()
evaluation_tools = EvaluationTools()
subject_tools = SubjectTools()
class_tools = ClassTools()

# Get user-related data

@router.get("/v1/admin/users")
@require_auth(require_admin=True)
async def get_users(request: Request) -> JSONResponse:
    limit = max(1, min(int(request.query_params.get("limit") or 50), 200))
    offset = max(0, int(request.query_params.get("offset") or 0))
    search = request.query_params.get("search", None)
    verified_raw = request.query_params.get("verified", None)
    banned_raw = request.query_params.get("banned", None)
    verified = None if verified_raw is None else bool(verified_raw.lower() == "true")
    banned = None if banned_raw is None else bool(banned_raw.lower() == "true")
    active = None if banned is None else not banned
    role = request.query_params.get("role", None)
    if role not in ("admin", "superadmin", "user"):
        role = None
    sort = request.query_params.get("sort", None) or "created_at"
    if sort not in ("created_at", "updated_at", "name", "email"):
        sort = "created_at"
    order = request.query_params.get("order", None) or "desc"
    if order not in ("asc", "desc"):
        order = "desc"

    cache_key = user_tools.admin_users_list_cache_key(limit, offset, search, verified, active, role, sort, order)
    cached = db.redis.get(cache_key)
    if cached:
        return JSONResponse(json.loads(cached))

    users, total = user_tools.get_users(
        limit=limit, offset=offset, search=search, verified=verified, active=active, role=role, sort=sort, order=order
    )
    response = {
        "success": True,
        "users": [user.model_dump(mode="json") for user in users],
        "total": total,
    }

    db.redis.set(cache_key, json.dumps(response), ex=60)
    return JSONResponse(response)

@router.get("/v1/admin/users/{user_id}")
@require_auth(require_admin=True)
async def get_user(request: Request, user_id: str) -> JSONResponse:
    user = user_tools.get_user_by_id(user_id)
    safe_user = SafeUser.model_validate(user)
    return JSONResponse({"success": True, "user": safe_user.model_dump(mode="json")})

@router.get("/v1/admin/users/{user_id}/{content_type}")
@require_auth(require_admin=True)
async def get_user_content(request: Request, user_id: str, content_type: str) -> JSONResponse:

    user_uuid = uuid.UUID(user_id)
    user_tools.get_user_by_id(user_uuid)  # raises UserNotFoundError if the user does not exist
    match content_type:
        case "classes":
            content = class_tools.get_user_class_schedule(user_uuid)
        case "cancellations":
            content = class_tools.get_user_cancelled_classes(user_uuid)
        case "evaluations":
            content = evaluation_tools.get_user_evaluations(user_uuid)
        case "subjects":
            content = subject_tools.get_user_subjects(user_uuid)
        case _:
            raise AdminInvalidContentType

    return JSONResponse(jsonable_encoder({"success": True, "content": content}))

# Admin actions for users

@router.post("/v1/admin/users/{user_id}/actions/resend_verification_email")
@require_auth(require_admin=True)
async def resend_verification_email(request: Request, user_id: str) -> JSONResponse:
    user = user_tools.get_user_by_id(user_id)
    user_tools.send_verification_link(user.id, user.name, user.email)
    
    return JSONResponse({"success": True, "message": "done! sent them a link to their email!"})

@router.post("/v1/admin/users/{user_id}/actions/suspend")
@require_auth(require_admin=True)
@valid_json(["reason"])
async def suspend_user(request: Request, user_id: str) -> JSONResponse:
    reason = request.state.json["reason"]
    user_tools.suspend_user(uuid.UUID(user_id), reason, request.state.user.name)

    return JSONResponse({"success": True, "message": "The user has been suspended and notified via email."})

@router.post("/v1/admin/users/{user_id}/actions/unsuspend")
@require_auth(require_admin=True)
async def unsuspend_user(request: Request, user_id: str) -> JSONResponse:
    user_tools.unsuspend_user(uuid.UUID(user_id))

    return JSONResponse({"success": True, "message": "The user has been unsuspended. They have NOT been notified about this action."})