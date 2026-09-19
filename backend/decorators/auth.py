from functools import wraps
from fastapi import Request
import jwt
import os
from errors.user import *
from errors.api_keys import *
from tools.sessions import SessionTools
from tools.api_keys import ApiKeyTools, KEY_PREFIX
from tools.users import UserTools
from typing import TypeVar, ParamSpec, Callable, Awaitable, cast
import sentry_sdk

P = ParamSpec("P")
R = TypeVar("R")


def require_auth(func: Callable[P, Awaitable[R]] | None = None, *, require_admin: bool = False, require_superadmin: bool = False, allow_unverified_email: bool = False) -> Callable[[Callable[P, Awaitable[R]]], Callable[P, Awaitable[R]]]:
    def decorator(fn: Callable[P, Awaitable[R]]) -> Callable[P, Awaitable[R]]:
        @wraps(fn)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            session_tools = SessionTools()
            user_tools = UserTools()
            api_key_tools = ApiKeyTools()
            jwt_secret = os.environ.get("JWT_SECRET", "")

            request = cast(Request | None, kwargs.get("request"))
            if request is None:
                for a in args:
                    if isinstance(a, Request):
                        request = a
                        break

            auth_token = None
            if request is not None:
                auth_token = request.headers.get("Authorization", None)

            if auth_token is None or not auth_token.startswith("Bearer "):
                raise InvalidOrExpiredTokenError

            auth_token = auth_token.split(" ")[1]

            if auth_token.startswith(KEY_PREFIX):
                api_key = api_key_tools.get_key_by_token(auth_token)
                if api_key is None:
                    raise InvalidOrExpiredTokenError
                user = user_tools.get_user_by_id(api_key.user_id)
                via = "api"
            else:
                try:
                    payload = jwt.decode(auth_token, jwt_secret, algorithms=["HS256"])
                except:
                    raise InvalidOrExpiredTokenError

                if not session_tools.is_valid_session(auth_token):
                    raise InvalidOrExpiredTokenError
                user = user_tools.get_user_by_id(payload["sub"])
                via = "web"

            if not user.active:
                raise UserSuspendedError
            if not user.admin and require_admin:
                raise UserNotAdmin

            if not user.superadmin and require_superadmin:
                raise UserNotSuperAdmin
            
            if not user.email_verified and not allow_unverified_email and not user.admin:
                raise UserNotVerifiedError
            
            if request is not None:
                request.state.user = user
                request.state.token = auth_token
                request.state.via = via
                sentry_sdk.set_user({"id": str(user.id), "email": user.email})

            return await fn(*args, **kwargs)
        return wrapper

    if callable(func):
        return decorator(func)  # type: ignore
    return decorator