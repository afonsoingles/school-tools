import datetime

from fastapi import APIRouter, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from decorators.valid_json import valid_json
from errors.holidays import *
from tools.holidays import HolidayTools

router = APIRouter()
holiday_tools = HolidayTools()


def _parse_date(value) -> datetime.date:
    try:
        return datetime.date.fromisoformat(str(value))
    except (ValueError, TypeError):
        raise InvalidHolidayDate


@router.get("/v1/holidays")
@require_auth
async def get_holiday_settings(request: Request) -> JSONResponse:
    settings = holiday_tools.get_settings(request.state.user.id)
    country = holiday_tools.get_holiday_country(request.state.user.id)

    return JSONResponse(jsonable_encoder({
        "success": True,
        "auto_cancel_enabled": settings.auto_cancel_enabled,
        "overrides": settings.overrides,
        "country": country,
    }))


@router.patch("/v1/holidays")
@require_auth
@valid_json(["auto_cancel_enabled"])
async def set_holiday_settings(request: Request) -> JSONResponse:
    if not isinstance(request.state.json["auto_cancel_enabled"], bool):
        raise InvalidHolidaySettings

    if request.state.json["auto_cancel_enabled"]:
        country = holiday_tools.get_holiday_country(request.state.user.id)
        if not country:
            raise HolidayCountryUnknown

    settings = holiday_tools.set_auto_cancel(request.state.user.id, request.state.json["auto_cancel_enabled"])

    return JSONResponse(jsonable_encoder({
        "success": True,
        "auto_cancel_enabled": settings.auto_cancel_enabled,
        "overrides": settings.overrides,
        "country": holiday_tools.get_holiday_country(request.state.user.id),
    }))


@router.post("/v1/holidays/overrides")
@require_auth
@valid_json(["date"])
async def add_holiday_override(request: Request) -> JSONResponse:
    override_date = _parse_date(request.state.json["date"])
    settings = holiday_tools.add_override(request.state.user.id, override_date)

    return JSONResponse(jsonable_encoder({
        "success": True,
        "auto_cancel_enabled": settings.auto_cancel_enabled,
        "overrides": settings.overrides,
        "country": holiday_tools.get_holiday_country(request.state.user.id),
    }))


@router.delete("/v1/holidays/overrides/{date}")
@require_auth
async def remove_holiday_override(request: Request, date: str) -> JSONResponse:
    override_date = _parse_date(date)
    settings = holiday_tools.remove_override(request.state.user.id, override_date)

    return JSONResponse(jsonable_encoder({
        "success": True,
        "auto_cancel_enabled": settings.auto_cancel_enabled,
        "overrides": settings.overrides,
        "country": holiday_tools.get_holiday_country(request.state.user.id),
    }))