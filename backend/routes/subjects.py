from fastapi import APIRouter, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from decorators.valid_json import valid_json
from errors.subject import *
from tools.subjects import SubjectTools
from models.subject import SubjectIcon, SubjectColor
from tools.audit import audit_request
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

    audit_request(request, "create", "subject", resource_id=subject.id, summary=f"Created subject '{subject.name}'")
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

    audit_request(request, "delete", "subject", resource_id=subject.id, summary=f"Deleted subject '{subject.name}'")
    return JSONResponse({"success": True, "message":"Deleted subject successfully."})

@router.patch("/v1/subjects/{subject_id}")
@require_auth
@valid_json()
async def edit_subject(request: Request, subject_id: str) -> JSONResponse:
    json = request.state.json
    new_name = json.get("new_name")
    new_icon = json.get("new_icon")
    new_color = json.get("new_color")

    if not (new_name or new_icon or new_color):
        raise SubjectEditMissingFields

    edited = False

    if new_name:
        new_name = str(new_name).strip()
        if len(new_name) < 3 or len(new_name) > 50:
            raise InvalidSubjectName
        edited = True

    if new_icon:
        try:
            new_icon = SubjectIcon(new_icon)
        except:
            raise InvalidSubjectIcon
        edited = True

    if new_color:
        try:
            new_color = SubjectColor(new_color)
        except:
            raise InvalidSubjectColor
        edited = True

    if not edited:
        raise SubjectEditMissingFields

    data = {}
    if new_name:
        data["name"] = new_name
    if new_icon:
        data["icon"] = new_icon
    if new_color:
        data["color"] = new_color

    try:
        parsed_subject_id = uuid.UUID(subject_id)
    except (ValueError, TypeError, AttributeError):
        raise SubjectNotFound

    subject = tools.edit_subject(user_id=request.state.user.id, subject_id=parsed_subject_id, data=data)
    if not subject:
        raise SubjectNotFound

    audit_request(request, "update", "subject", resource_id=subject.id, summary=f"Updated subject '{subject.name}'")
    return JSONResponse(jsonable_encoder({"success": True, "subject": subject.model_dump()}))