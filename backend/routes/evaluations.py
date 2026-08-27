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
import uuid
import datetime


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
        date_obj = datetime.datetime.fromisoformat(request.state.json["date"]).replace(hour=0, minute=0, second=0, microsecond=0)
        date_weekday = date_obj.weekday()
    except:
        raise InvalidDate
    
    try:
        class_id = uuid.UUID(request.state.json["class_id"])
        user_classes = class_tools.get_user_class_schedule(request.state.user.id)
        cancellations = class_tools.get_user_canceled_classes(request.state.user.id)
        if not any(
            cls.id == class_id and int(getattr(cls.weekday, "value", cls.weekday)) == date_weekday + 1
            for cls in user_classes
        ):
            raise ClassNotFound
        if any(cancellation.class_id == class_id and cancellation.date.date() == date_obj.date() for cancellation in cancellations):
            raise ClassCancelled

    except:
        raise ClassNotFound

    evaluation = evaluation_tools.create_evaluation(
        user_id=request.state.user.id,
        class_id=class_id,
        date=date_obj,
        type=evaluation_type,
    )

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
        raise ClassNotFound

    evaluation_tools.delete_evaluation(request.state.user.id, evaluation_uuid)
    return JSONResponse({"success": True, "message": "Evaluation deleted successfully."})
