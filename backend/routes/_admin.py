from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from utils.database import Database
from tools.users import UserTools
from models.user import SafeUser

router = APIRouter()
db = Database()
user_tools = UserTools()

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
