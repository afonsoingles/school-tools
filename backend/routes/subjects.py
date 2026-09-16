from fastapi import APIRouter, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from decorators.valid_json import valid_json
from errors.subject import *
from tools.subjects import SubjectTools
from models.subject import SubjectIcon, SubjectColor
import uuid

router = APIRouter()
tools = SubjectTools()

@router.post("/v1/subjects")
@require_auth
@valid_json(["name", "icon", "color"])
async def subject_create(request: Request) -> JSONResponse:
    name = request.state.json["name"]
    if len(name) < 3 or len(name) > 50:
        raise InvalidSubjectName
    try:
        icon = SubjectIcon(request.state.json["icon"])
    except:
        raise InvalidSubjectIcon
    try:
        color = SubjectColor(request.state.json["color"])
    except:
        raise InvalidSubjectColor
    subject = tools.create_subject(request.state.user.id, name, icon, color)

    return JSONResponse(jsonable_encoder({"success": True, "subject": subject.model_dump()}))

@router.get("/v1/subjects")
@require_auth
async def get_user_subjects(request: Request) -> JSONResponse:
    subjects = tools.get_user_subjects(request.state.user.id)

    return JSONResponse(jsonable_encoder({"success": True, "subjects": [subject.model_dump() for subject in subjects]}))

@router.delete("/v1/subjects/{subject_id}")
@require_auth
async def delete_subject(request: Request, subject_id: str) -> JSONResponse:
    subject = tools.delete_subject(request.state.user.id, subject_id)
    if not subject:
        raise SubjectNotFound

    return JSONResponse({"success": True, "message":"Deleted subject successfully."})

@router.patch("/v1/subjects/{subject_id}")
@require_auth
async def edit_subject(request: Request, subject_id: str) -> JSONResponse:
    json = await request.json()
    if not json.get("new_name") and not json.get("new_icon") and not json.get("new_color"):
        raise SubjectEditMissingFields

    edited = False

    if json.get("new_name"):
        new_name = str(json["new_name"]).strip()
        if len(new_name) < 3 or len(new_name) > 50:
            raise InvalidSubjectName
        edited = True

    if json.get("new_icon"):
        try:
            new_icon = SubjectIcon(json["new_icon"])
        except:
            raise InvalidSubjectIcon
        edited = True

    if json.get("new_color"):
        try:
            new_color = SubjectColor(json["new_color"])
        except:
            raise InvalidSubjectColor
        edited = True

    if not edited:
        raise SubjectEditMissingFields

    data = {}
    if json.get("new_name"):
        data["name"] = new_name
    if json.get("new_icon"):
        data["icon"] = new_icon
    if json.get("new_color"):
        data["color"] = new_color

    subject = tools.edit_subject(user_id=request.state.user.id, subject_id=uuid.UUID(subject_id), data=data)
    if not subject:
        raise SubjectNotFound

    return JSONResponse(jsonable_encoder({"success": True, "subject": subject.model_dump()}))