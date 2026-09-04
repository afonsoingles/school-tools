from fastapi import APIRouter, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from decorators.valid_json import valid_json
from errors.subject import *
from errors.homework import *
from errors.classes import InvalidTimeFormat
from tools.homework import HomeworkTools
from tools.subjects import SubjectTools
from models.homework import Homework, SafeHomework, HomeworkStatus
import uuid
import datetime
from zoneinfo import ZoneInfo
from utils.times import parse_user_datetime


router = APIRouter()
homework_tools = HomeworkTools()
subject_tools = SubjectTools()


@router.post("/v1/homework")
@require_auth
@valid_json(["subject_id", "title", "description", "due_date"])
async def create_homework(request: Request) -> JSONResponse:

    try:
        due_date = parse_user_datetime(request.state.json["due_date"], request.state.user.timezone)
    except HomeworkDateInThePast:
        raise
    except:
        raise InvalidTimeFormat


    if not subject_tools.does_subject_exist(user_id=request.state.user.id, subject_id=request.state.json["subject_id"]): 
        raise SubjectNotFound

    if len(request.state.json["title"]) > 70 or not request.state.json["title"].strip():
        raise InvalidHomeworkTitle

    if len(request.state.json["description"]) > 1500 or not request.state.json["description"].strip():
        raise InvalidHomeworkDescription
    
    homework = Homework(
        user_id=request.state.user.id,
        subject_id=uuid.UUID(request.state.json["subject_id"]),
        title=request.state.json["title"],
        description=request.state.json["description"],
        status=HomeworkStatus.NOT_STARTED,
        due_date=due_date
    )

    homework = homework_tools.create_homework(homework)
    safe_homework = SafeHomework.model_validate(homework)
    return JSONResponse(jsonable_encoder({"success": True, "homework": safe_homework.model_dump()}), status_code=201)

@router.get("/v1/homework")
@require_auth
async def get_homework(request: Request) -> JSONResponse:
    homework = homework_tools.get_user_homeworks(request.state.user.id)

    return JSONResponse(jsonable_encoder({"success": True, "homework": [hw.model_dump() for hw in homework]}))

@router.patch("/v1/homework/{homework_id}")
@require_auth
@valid_json(["title", "description", "due_date", "status"])
async def update_homework(request: Request, homework_id: str) -> JSONResponse:
    try:
        hw_id = uuid.UUID(homework_id)
    except:
        raise HomeworkNotFound

    try:
        due_date = parse_user_datetime(request.state.json["due_date"], request.state.user.timezone)
    except HomeworkDateInThePast:
        existing_hw = homework_tools.get_user_homeworks(request.state.user.id)
        for hw in existing_hw:
            if hw.id == hw_id:
                due_date = hw.due_date
                break
        else:
            raise
    except:
        raise InvalidTimeFormat

    try:
        status = HomeworkStatus(request.state.json["status"])
    except:
        raise InvalidHomeworkStatus

    if len(request.state.json["title"]) > 70 or not request.state.json["title"].strip():
        raise InvalidHomeworkTitle

    if len(request.state.json["description"]) > 1500 or not request.state.json["description"].strip():
        raise InvalidHomeworkDescription
    
    result = homework_tools.update_homework(
        user_id=request.state.user.id,
        homework_id=hw_id,
        update_data={
            "title": request.state.json["title"],
            "description": request.state.json["description"],
            "due_date": due_date,
            "status": status
        }
    )

    safe_result = SafeHomework.model_validate(result)
    return JSONResponse(jsonable_encoder({"success": True, "homework": safe_result.model_dump()}))

@router.delete("/v1/homework/{homework_id}")
@require_auth
async def delete_homework(request: Request, homework_id: str) -> JSONResponse:
    try:
        hw_id = uuid.UUID(homework_id)
    except:
        raise HomeworkNotFound

    result = homework_tools.delete_homework(
        user_id=request.state.user.id,
        homework_id=hw_id
    )

    if not result:
        raise HomeworkNotFound

    safe_result = SafeHomework.model_validate(result)
    return JSONResponse(jsonable_encoder({"success": True, "homework": safe_result.model_dump()}))