from pydantic import BaseModel, Field, ConfigDict
from models.time_field import HHMM
from enum import Enum
import datetime
import uuid


class EvaluationType(str, Enum):
    EXAM = "exam"
    QUIZ = "quiz"
    WORKSHEET = "worksheet"
    REPORT = "report"
    OTHER = "other"


class SafeEvaluation(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")
                              
    id: uuid.UUID =  Field(default_factory=uuid.uuid4)
    class_id: uuid.UUID
    date: datetime.datetime
    type: EvaluationType
    grade: int | None = Field(default=None, ge=0, le=100)

class Evaluation(SafeEvaluation):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")
                              
    user_id: uuid.UUID