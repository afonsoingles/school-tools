from fastapi import APIRouter, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from decorators.valid_json import valid_json
from errors.evaluations import *
from errors.classes import ClassNotFound, InvalidDate, ClassCancelled
from tools.classes import ClassTools
from models.classes import Weekday
from tools.evaluations import EvaluationTools
from models.evaluation import SafeEvaluation, EvaluationType
from tools.audit import audit_request
import uuid
import datetime
from zoneinfo import ZoneInfo


router = APIRouter()
evaluation_tools = EvaluationTools()
class_tools = ClassTools()


@router.post("/v1/evaluations")
@require_auth
@valid_json(["class_id", "type", "date"])
async def add_evaluation(request: Request) -> JSONResponse:
    try:
        evaluation_type = EvaluationType(str(request.state.json["type"]))
    except:
        raise InvalidEvaluationType
    
    try:
        date_obj = datetime.datetime.fromisoformat(request.state.json["date"])
        if date_obj.tzinfo is not None:
            date_obj = date_obj.astimezone(ZoneInfo(request.state.user.timezone)).replace(tzinfo=None)
        date_obj = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
        date_weekday = date_obj.weekday()
    except:
        raise InvalidDate
    
    try:
        class_id = uuid.UUID(request.state.json["class_id"])
        user_classes = class_tools.get_user_class_schedule(request.state.user.id)
        cancellations = class_tools.get_user_cancelled_classes(request.state.user.id)
        if not any(
            cls.id == class_id and any(
                int(getattr(schedule.scheduled_weekday, "value", schedule.scheduled_weekday)) == date_weekday + 1
                and schedule.valid_from <= date_obj.date()
                and (schedule.valid_until is None or schedule.valid_until >= date_obj.date())
                for schedule in cls.schedules
            )
            for cls in user_classes
        ):
            raise ClassNotFound
        if any(cancellation.class_id == class_id and cancellation.date == date_obj.date() for cancellation in cancellations):
            raise ClassCancelled
    except ClassCancelled:
        raise ClassCancelled
    except:
        raise ClassNotFound

    grade = request.state.json.get("grade")
    if grade is not None and (not isinstance(grade, int) or isinstance(grade, bool) or not (0 <= grade <= 100)):
        raise InvalidEvaluationGrade

    evaluation = evaluation_tools.create_evaluation(
        user_id=request.state.user.id,
        class_id=class_id,
        date=date_obj,
        type=evaluation_type,
        grade=grade,
    )

    audit_request(request, "create", "evaluation", resource_id=evaluation.id, summary=f"Created {evaluation_type.value} evaluation on {date_obj.date().isoformat()}")
    return JSONResponse(jsonable_encoder({"success": True, "evaluation": SafeEvaluation(**evaluation.model_dump()).model_dump()}))

@router.get("/v1/evaluations")
@require_auth
async def get_evaluation(request: Request) -> JSONResponse:
    evaluations = evaluation_tools.get_user_evaluations(request.state.user.id)
    evaluations = [SafeEvaluation(**evl.model_dump()) for evl in evaluations]

    return JSONResponse(jsonable_encoder({"success": True, "evaluations": evaluations}))

@router.delete("/v1/evaluations/{evaluation_id}")
@require_auth
async def delete_evaluation(request: Request, evaluation_id: str) -> JSONResponse:
    try:
        evaluation_uuid = uuid.UUID(evaluation_id)
    except:
        raise EvaluationNotFound

    evaluation_tools.delete_evaluation(request.state.user.id, evaluation_uuid)
    audit_request(request, "delete", "evaluation", resource_id=evaluation_uuid, summary=f"Deleted evaluation {evaluation_uuid}")
    return JSONResponse({"success": True, "message": "Evaluation deleted successfully."})


@router.patch("/v1/evaluations/{evaluation_id}")
@require_auth
@valid_json(["grade"])
async def update_evaluation_grade(request: Request, evaluation_id: str) -> JSONResponse:
    try:
        evaluation_uuid = uuid.UUID(evaluation_id)
    except:
        raise EvaluationNotFound

    grade = request.state.json["grade"]
    if grade is not None and (not isinstance(grade, int) or isinstance(grade, bool) or not (0 <= grade <= 100)):
        raise InvalidEvaluationGrade

    evaluation = evaluation_tools.update_grade(request.state.user.id, evaluation_uuid, grade)
    audit_request(request, "update", "evaluation", resource_id=evaluation_uuid, summary=f"Updated grade for evaluation {evaluation_uuid}")
    return JSONResponse(jsonable_encoder({"success": True, "evaluation": SafeEvaluation(**evaluation.model_dump()).model_dump()}))
