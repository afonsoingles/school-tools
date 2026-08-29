from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from jobs.generate_ics import generate_and_publish_ics_feed
from tools.calendar import CalendarTools
from models.calendar import *
from errors.calendar import *
from errors.base import BaseError
import os
import uuid

router = APIRouter()
tools = CalendarTools()

@router.get("/v1/calendar/feeds")
@require_auth
async def get_feed(request: Request) -> JSONResponse:

    feeds = tools.get_calendar_tokens(request.state.user.id)
    if not feeds:
        feeds = tools.generate_calendar_tokens(request.state.user.id)


    return JSONResponse({"success": True, "feeds": {
        "classes": f"{os.environ.get("BASE_URL")}/api/v1/calendar/feeds/classes/{feeds.token_classes}?user={str(request.state.user.id)}",
        "evaluations": f"{os.environ.get("BASE_URL")}/api/v1/calendar/feeds/evaluations/{feeds.token_evaluations}?user={str(request.state.user.id)}"
    }})

@router.post("/v1/calendar/feeds")
@require_auth
async def regenerate_feed(request: Request) -> JSONResponse:
    feeds = tools.generate_calendar_tokens(request.state.user.id)

    return JSONResponse({"success": True, "feeds": {
        "classes": f"{os.environ.get("BASE_URL")}/api/v1/calendar/feeds/classes/{feeds.token_classes}?user={str(request.state.user.id)}",
        "evaluations": f"{os.environ.get("BASE_URL")}/api/v1/calendar/feeds/evaluations/{feeds.token_evaluations}?user={str(request.state.user.id)}"
    }})

@router.get("/v1/calendar/feeds/{type}/{token}")
async def get_feed_by_token(request: Request, type: str, token: str) -> Response:
    if type not in ["classes", "evaluations"]:
        raise InvalidFeedRequest

    user = request.query_params.get("user")
    try:
        user_id = uuid.UUID(user)
    except:
        raise InvalidFeedRequest

    type = CalendarFeedType(type)
    if not tools.is_valid_feed_request(user_id, token, type):
        raise InvalidFeedRequest
    
    feed = tools.get_calendar_feed(user_id, type)
    if not feed:
        generate_and_publish_ics_feed(user_id)
        feed = tools.get_calendar_feed(user_id, type)
        if not feed:
            raise BaseError

    return Response(content=feed, media_type="text/calendar", headers={"Content-Disposition": f"attachment; filename={type.value}.ics", "Cache-Control": "no-cache"})