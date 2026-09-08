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
import uuid


router = APIRouter()
db = Database()
user_tools = UserTools()
evaluation_tools = EvaluationTools()
subject_tools = SubjectTools()
class_tools = ClassTools()


# Users
@router.get("/v1/admin/users")
@require_auth(require_admin=True)
async def get_users(request: Request) -> JSONResponse:
    limit = int(request.query_params.get("limit", 10))
    offset = int(request.query_params.get("offset", 0))
    search = request.query_params.get("search", None)

    users = user_tools.get_users(limit=limit, offset=offset, search=search)
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
    user = user_tools.update_user(user_id, **data)

    safe_user = SafeUser.model_validate(user)

    return JSONResponse({"success": True, "user": safe_user.model_dump(mode="json")})

@router.post("/v1/admin/users/{user_id}/resend_verification_email")
@require_auth(require_admin=True)
async def resend_verification_email(request: Request, user_id: str) -> JSONResponse:
    user = user_tools.get_user_by_id(user_id)
    user_tools.send_verification_link(user.id, user.name, user.email)

    return JSONResponse({"success": True, "message": "done! sent them a link to their email!"})
