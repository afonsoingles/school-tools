from fastapi import APIRouter, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from decorators.valid_json import valid_json
from errors.classes import *
from tools.subjects import SubjectTools
from tools.classes import ClassTools
from models.time_field import is_valid_hhmm_string
from models.classes import Weekday, SafeClassEvent, SafeCanceledClassEvent, CancellationReason
import uuid
import datetime


router = APIRouter()
subject_tools = SubjectTools()
class_tools = ClassTools()

# Class Schedule
@router.post("/v1/classes")
@require_auth
@valid_json(["subject_id", "weekday", "start_time", "end_time"])
async def add_class(request: Request) -> JSONResponse:
   
    if request.state.json["weekday"] not in ["1", "2", "3", "4", "5", "6", "7"]:
        raise InvalidWeekday

    if not is_valid_hhmm_string(request.state.json["start_time"]):
        raise InvalidTimeFormat

    if not is_valid_hhmm_string(request.state.json["end_time"]):
        raise InvalidTimeFormat

    user_subjects = subject_tools.get_user_subjects(request.state.user.id)
    subject_exists = any(str(subject.id) == request.state.json["subject_id"] for subject in user_subjects)
    if not subject_exists:
        raise SubjectNotFoundForClass

    class_event = class_tools.create_class(
        user_id=request.state.user.id,
        subject=request.state.json["subject_id"],
        weekday=Weekday(int(request.state.json["weekday"])),
        start=request.state.json["start_time"],
        end=request.state.json["end_time"]
    )

    return JSONResponse(jsonable_encoder({"success": True, "class": SafeClassEvent(**class_event.model_dump()).model_dump()}))

@router.get("/v1/classes/schedule")
@require_auth
async def get_classes(request: Request) -> JSONResponse:
    classes = class_tools.get_user_class_schedule(request.state.user.id)
    classes = [SafeClassEvent(**cls.model_dump()) for cls in classes]

    return JSONResponse({"success": True, "classes": [cls.model_dump() for cls in classes]})

@router.delete("/v1/classes/{class_id}")
@require_auth
async def delete_class(request: Request, class_id: str) -> JSONResponse:
    try:
        class_uuid = uuid.UUID(class_id)
    except:
        raise ClassNotFound
    
    class_tools.delete_class(request.state.user.id, class_uuid)
    return JSONResponse({"success": True, "message": "Class deleted successfully."})

# Class Cancellation
# / cancel and /uncancel

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

    try:
        cancel_date = datetime.datetime.strptime(request.state.json["date"], "%d/%m/%Y").date()
    except:
        raise InvalidDate

    for class_event in class_tools.get_user_canceled_classes(request.state.user.id):
        if class_event.class_id == class_uuid and class_event.canceled_date == cancel_date:
            raise ClassAlreadyCanceled
    
    canceled_class = class_tools.cancel_class(user_id=request.state.user.id, class_id=class_uuid, date=cancel_date, reason=reason)
    safe_class = SafeCanceledClassEvent(**canceled_class.model_dump())

    return JSONResponse({"success": True, "cancellation": safe_class.model_dump()})

@router.post("/v1/classes/uncancel")
@require_auth
@valid_json(["cancellation_id"])
async def uncancel_class(request: Request) -> JSONResponse:
    try:
        cancellation_uuid = uuid.UUID(request.state.json["cancellation_id"])
    except:
        raise CancellationNotFound

    class_tools.uncancel_class(cancellation_uuid)
    
    return JSONResponse({"success": True, "message": "Class uncanceled successfully."})