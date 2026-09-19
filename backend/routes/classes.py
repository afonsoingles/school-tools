import json

from fastapi import APIRouter, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from decorators.valid_json import valid_json
from errors.classes import *
from tools.subjects import SubjectTools
from tools.classes import ClassTools
from tools.holidays import HolidayTools
from tools.audit import audit_request
from models.time_field import is_valid_hhmm_string
from models.classes import Weekday, SafeClassEvent, SafeClassCancellation, SafeDayCancellation, CancellationReason
import datetime
import uuid


router = APIRouter()
subject_tools = SubjectTools()
class_tools = ClassTools()
holiday_tools = HolidayTools()


def _parse_weekday(value) -> Weekday:
    try:
        weekday = Weekday(int(value))
    except (ValueError, TypeError):
        raise InvalidWeekday
    if weekday not in Weekday:
        raise InvalidWeekday
    return weekday


def _parse_time(value) -> str:
    if not is_valid_hhmm_string(str(value)):
        raise InvalidTimeFormat
    return str(value)


def _parse_date(value) -> datetime.date:
    try:
        return datetime.datetime.strptime(str(value), "%d/%m/%Y").date()
    except (ValueError, TypeError):
        raise InvalidDate


def _validate_note(reason: CancellationReason, note) -> str | None:
    note = (note or "").strip()
    if reason == CancellationReason.OTHER and not note:
        raise NoteRequiredForOther
    return note or None


def _parse_schedule(schedule: dict) -> dict:
    return {
        "scheduled_weekday": _parse_weekday(schedule["scheduled_weekday"]),
        "start_time": _parse_time(schedule["start_time"]),
        "end_time": _parse_time(schedule["end_time"]),
    }


def _safe_class(class_event):
    return SafeClassEvent(**class_event.model_dump()).model_dump(mode="json")


def _auto_holiday_offs(user_id, classes: list) -> list[str]:
    
    if not classes:
        return []

    horizon = datetime.date.today() + datetime.timedelta(days=366)
    holiday_dates: set[str] = set()

    for cls in classes:
        for s in cls.schedules:
            if s.valid_until is not None and s.valid_until < s.valid_from:
                continue
            window_end = s.valid_until if s.valid_until is not None else horizon
            if window_end < s.valid_from:
                continue
            holiday_dates.update(
                holiday_tools.get_auto_holiday_dates(user_id, s.valid_from, window_end)
            )

    return sorted(holiday_dates)


# Class Schedule
@router.post("/v1/classes")
@require_auth
@valid_json(["subject_id", "schedules"])
async def add_class(request: Request) -> JSONResponse:
    schedules_raw = request.state.json["schedules"]
    if not isinstance(schedules_raw, list) or len(schedules_raw) == 0:
        raise InvalidSchedules

    try:
        schedules = [_parse_schedule(schedule) for schedule in schedules_raw]
    except KeyError:
        raise InvalidSchedule

    if not subject_tools.does_subject_exist(user_id=request.state.user.id, subject_id=request.state.json["subject_id"]):
        raise SubjectNotFoundForClass

    class_event = class_tools.create_class(
        user_id=request.state.user.id,
        subject=request.state.json["subject_id"],
        schedules=schedules,
    )

    audit_request(request, "create", "class", resource_id=class_event.id, summary=f"Created class with {len(schedules)} schedule(s)")
    return JSONResponse(jsonable_encoder({"success": True, "class": _safe_class(class_event)}))


@router.get("/v1/classes")
@require_auth
async def get_classes(request: Request) -> JSONResponse:
    classes = class_tools.get_user_class_schedule(request.state.user.id)
    day_cancellations = class_tools.get_user_day_cancellations(request.state.user.id)
    auto_holiday_offs = _auto_holiday_offs(request.state.user.id, classes)

    return JSONResponse(jsonable_encoder({
        "success": True,
        "classes": [_safe_class(cls) for cls in classes],
        "day_cancellations": [SafeDayCancellation(**dc.model_dump()).model_dump(mode="json") for dc in day_cancellations],
        "auto_holiday_offs": auto_holiday_offs,
    }))


# Backward-compatible alias for the old endpoint
@router.get("/v1/classes/schedule")
@require_auth
async def get_classes_schedule(request: Request) -> JSONResponse:
    classes = class_tools.get_user_class_schedule(request.state.user.id)

    return JSONResponse(jsonable_encoder({"success": True, "classes": [_safe_class(cls) for cls in classes]}))


@router.patch("/v1/classes/{class_id}")
@require_auth
@valid_json(["subject_id"])
async def update_class_subject(request: Request, class_id: str) -> JSONResponse:
    try:
        class_uuid = uuid.UUID(class_id)
    except:
        raise ClassNotFound

    if not subject_tools.does_subject_exist(user_id=request.state.user.id, subject_id=request.state.json["subject_id"]):
        raise SubjectNotFoundForClass

    class_event = class_tools.set_class_subject(request.state.user.id, class_uuid, request.state.json["subject_id"])
    audit_request(request, "update", "class", resource_id=class_uuid, summary=f"Changed class subject to {request.state.json['subject_id']}")
    return JSONResponse(jsonable_encoder({"success": True, "class": _safe_class(class_event)}))


@router.delete("/v1/classes/{class_id}")
@require_auth
async def delete_class(request: Request, class_id: str) -> JSONResponse:
    try:
        class_uuid = uuid.UUID(class_id)
    except:
        raise ClassNotFound

    class_tools.delete_class(request.state.user.id, class_uuid)
    audit_request(request, "delete", "class", resource_id=class_uuid, summary="Deleted class")
    return JSONResponse({"success": True, "message": "Class deleted successfully."})


# Schedules
@router.post("/v1/classes/{class_id}/schedules")
@require_auth
@valid_json(["scheduled_weekday", "start_time", "end_time"])
async def add_schedule(request: Request, class_id: str) -> JSONResponse:
    try:
        class_uuid = uuid.UUID(class_id)
    except:
        raise ClassNotFound

    schedule = _parse_schedule(request.state.json)
    class_event = class_tools.add_schedule(
        user_id=request.state.user.id,
        class_id=class_uuid,
        weekday=schedule["scheduled_weekday"],
        start=schedule["start_time"],
        end=schedule["end_time"],
    )
    audit_request(request, "update", "class", resource_id=class_uuid, summary=f"Added schedule on weekday {schedule['scheduled_weekday'].value} at {schedule['start_time']}")
    return JSONResponse(jsonable_encoder({"success": True, "class": _safe_class(class_event)}))


@router.patch("/v1/classes/{class_id}/schedules/{schedule_id}")
@require_auth
@valid_json(["scheduled_weekday", "start_time", "end_time"])
async def reschedule(request: Request, class_id: str, schedule_id: str) -> JSONResponse:
    try:
        class_uuid = uuid.UUID(class_id)
        schedule_uuid = uuid.UUID(schedule_id)
    except:
        raise ClassNotFound

    schedule = _parse_schedule(request.state.json)
    valid_from = None
    if "date" in request.state.json and request.state.json["date"]:
        valid_from = _parse_date(request.state.json["date"])

    class_event = class_tools.reschedule_schedule(
        user_id=request.state.user.id,
        class_id=class_uuid,
        schedule_id=schedule_uuid,
        weekday=schedule["scheduled_weekday"],
        start=schedule["start_time"],
        end=schedule["end_time"],
        valid_from=valid_from,
    )
    audit_request(request, "update", "class", resource_id=class_uuid, summary=f"Rescheduled schedule {schedule_uuid}")
    return JSONResponse(jsonable_encoder({"success": True, "class": _safe_class(class_event)}))


@router.delete("/v1/classes/{class_id}/schedules/{schedule_id}")
@require_auth
async def delete_schedule(request: Request, class_id: str, schedule_id: str) -> JSONResponse:
    try:
        class_uuid = uuid.UUID(class_id)
        schedule_uuid = uuid.UUID(schedule_id)
    except:
        raise ClassNotFound

    class_event = class_tools.delete_class_schedule(request.state.user.id, class_uuid, schedule_uuid)
    audit_request(request, "update", "class", resource_id=class_uuid, summary=f"Deleted schedule {schedule_uuid}")
    return JSONResponse(jsonable_encoder({"success": True, "class": _safe_class(class_event)}))


# Cancellations (embedded per class)
@router.post("/v1/classes/{class_id}/cancel")
@require_auth
@valid_json(["date", "reason"])
async def cancel_class(request: Request, class_id: str) -> JSONResponse:
    try:
        class_uuid = uuid.UUID(class_id)
    except:
        raise ClassNotFound

    try:
        reason = CancellationReason(request.state.json["reason"])
    except:
        raise InvalidCancellationReason

    cancel_date = _parse_date(request.state.json["date"])
    note = _validate_note(reason, request.state.json.get("note"))

    class_event = class_tools.cancel_class(
        user_id=request.state.user.id,
        class_id=class_uuid,
        date=cancel_date,
        reason=reason,
        note=note,
    )
    cancellation = class_event.cancellations[-1]

    audit_request(request, "cancel", "class", resource_id=class_uuid, summary=f"Cancelled class on {cancel_date.isoformat()} ({reason.value})")
    return JSONResponse({"success": True, "cancellation": SafeClassCancellation(**cancellation.model_dump()).model_dump(mode="json")})


@router.delete("/v1/classes/{class_id}/cancellations/{cancellation_id}")
@require_auth
async def uncancel_class(request: Request, class_id: str, cancellation_id: str) -> JSONResponse:
    try:
        class_uuid = uuid.UUID(class_id)
        cancellation_uuid = uuid.UUID(cancellation_id)
    except:
        raise CancellationNotFound

    class_tools.uncancel_class(request.state.user.id, class_uuid, cancellation_uuid)

    audit_request(request, "uncancel", "class", resource_id=class_uuid, summary=f"Uncancelled class cancellation {cancellation_uuid}")
    return JSONResponse({"success": True, "message": "Class uncancelled successfully."})


# Day cancellations (whole day off)
@router.post("/v1/classes/cancel-day")
@require_auth
@valid_json(["date", "reason"])
async def cancel_day(request: Request) -> JSONResponse:
    try:
        reason = CancellationReason(request.state.json["reason"])
    except:
        raise InvalidCancellationReason

    cancel_date = _parse_date(request.state.json["date"])
    note = _validate_note(reason, request.state.json.get("note"))

    day_cancellation = class_tools.cancel_day(
        user_id=request.state.user.id,
        date=cancel_date,
        reason=reason,
        note=note,
    )
    audit_request(request, "cancel", "class", resource_id=day_cancellation.id, summary=f"Cancelled day {cancel_date.isoformat()} ({reason.value})")
    return JSONResponse({"success": True, "day_cancellation": SafeDayCancellation(**day_cancellation.model_dump()).model_dump(mode="json")})


@router.delete("/v1/classes/cancel-day/{day_cancel_id}")
@require_auth
async def uncancel_day(request: Request, day_cancel_id: str) -> JSONResponse:
    try:
        day_cancel_uuid = uuid.UUID(day_cancel_id)
    except:
        raise DayCancellationNotFound

    class_tools.uncancel_day(request.state.user.id, day_cancel_uuid)

    audit_request(request, "uncancel", "class", resource_id=day_cancel_uuid, summary=f"Uncancelled day {day_cancel_uuid}")
    return JSONResponse({"success": True, "message": "Day uncancelled successfully."})