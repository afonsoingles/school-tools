from pydantic import BaseModel, Field, ConfigDict
from models.time_field import HHMM
from enum import Enum
import datetime
import uuid

class Weekday(str, Enum):
    MONDAY = 1
    TUESDAY = 2
    WEDNESDAY = 3
    THURSDAY = 4
    FRIDAY = 5
    SATURDAY = 6
    SUNDAY = 7

class EvaluationType(str, Enum):
    EXAM = "exam"
    QUIZ = "quiz"
    OTHER = "other"

class CancelationReason(str, Enum):
    BREAK = "break"
    PUBLIC_HOLIDAY = "public_holiday"
    OTHER = "other"

class ScheduledClassEvent(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")
                              
    id: uuid.UUID =  Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    subject_id: uuid.UUID
    weekday: Weekday
    start_time: HHMM 
    end_time: HHMM

class EvaluationClassEvent(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    id: uuid.UUID =  Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    scheduled_class_id: uuid.UUID
    evaluation_type: EvaluationType
    evaluation_date: datetime.date

class CanceledClassEvent(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    id: uuid.UUID =  Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    scheduled_class_id: uuid.UUID
    canceled_date: datetime.date
    cancelation_reason: CancelationReason