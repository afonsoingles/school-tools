from functools import wraps
from fastapi import Request, HTTPException
import jwt
import os
from errors.user import InvalidOrExpiredTokenError, UserSuspendedError, UnsufficientPermissionsError
from tools.sessions import SessionTools
from tools.users import UserTools
from typing import TypeVar, ParamSpec, Callable, Awaitable, cast
from models.permissions import *

P = ParamSpec("P")
R = TypeVar("R")


def require_auth(func: Callable[P, Awaitable[R]] | None = None, *, permissions: list = [], require_admin: bool = False) -> Callable[[Callable[P, Awaitable[R]]], Callable[P, Awaitable[R]]]:
    def decorator(fn: Callable[P, Awaitable[R]]) -> Callable[P, Awaitable[R]]:
        @wraps(fn)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            session_tools = SessionTools()
            user_tools = UserTools()
            jwt_secret = os.environ.get("JWT_SECRET")

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

            try:
                payload = jwt.decode(auth_token, jwt_secret, algorithms=["HS256"])
            except:
                raise InvalidOrExpiredTokenError

            if not session_tools.is_valid_session(auth_token):
                raise InvalidOrExpiredTokenError
            user = user_tools.get_user_by_id(payload["sub"])

            if not user.active:
                raise UserSuspendedError
            if not user.admin and require_admin:
                raise UnsufficientPermissionsError
            
            for permission in permissions:
                if user.admin or user.superadmin:
                    continue
                if permission not in user.permissions:
                    raise UnsufficientPermissionsError

            if request is not None:
                request.state.user = user
                request.state.token = auth_token

            return await fn(*args, **kwargs)
        return wrapper

    if callable(func):
        return decorator(func)  # type: ignore
    return decorator