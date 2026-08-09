from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from tools.users import UserTools
from tools.sessions import SessionTools
from errors.user import UserSuspendedError, UserPasswordIncorrectError
from models.user import SafeUser
from decorators.auth import require_auth
from decorators.valid_json import valid_json

router = APIRouter()
user_tools = UserTools()
session_tools = SessionTools()

@router.post("/v1/auth/pwd")
@valid_json(["email", "password"])
async def authenticate(request: Request) -> JSONResponse:
    
    email = request.state.json["email"]
    password = request.state.json["password"]

    user = user_tools.get_user_by_email(email)

    stored_pwd = user.password.get_secret_value()
    
    check = user_tools.verify_password_hash(password, stored_pwd)

    if not check:
        raise UserPasswordIncorrectError

    if not user.active:
        raise UserSuspendedError
    
    token = session_tools.create_session(user.id)

    
    return JSONResponse({"success": True, "message": "Authentication was successful!", "token": token})

@router.get("/v1/auth/me")
@require_auth
async def me(request: Request) -> JSONResponse:
    
    user = SafeUser.model_validate(request.state.user)
    
    return JSONResponse({"success": True, "user": user.model_dump(mode="json")})

@router.post("/v1/auth/logout")
async def logout(request: Request) -> JSONResponse:

    session_tools.revoke_session(request.state.token)

    return JSONResponse({"success": True, "message": "Logged out and session revoked!"})