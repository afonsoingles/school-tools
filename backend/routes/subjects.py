import json

from fastapi import APIRouter, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from decorators.valid_json import valid_json
from errors.subject import *
from tools.subjects import SubjectTools
import uuid

router = APIRouter()
tools = SubjectTools()

@router.post("/v1/subjects")
@require_auth
@valid_json(["name"])
async def subject_create(request: Request) -> JSONResponse:
    name = request.state.json["name"]
    if len(name) < 3 or len(name) > 50:
        raise InvalidSubjectName

    subject = tools.create_subject(request.state.user.id, name)

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
@valid_json(["new_name"])
async def rename_subject(request: Request, subject_id: str) -> JSONResponse:
    new_name = request.state.json["new_name"]
    if len(new_name) < 3 or len(new_name) > 50:
        raise InvalidSubjectName

    subject = tools.rename_subject(request.state.user.id, uuid.UUID(subject_id), new_name)
    if not subject:
        raise SubjectNotFound

    return JSONResponse(jsonable_encoder({"success": True, "subject": subject.model_dump()}))