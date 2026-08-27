from pydantic import BaseModel, Field, ConfigDict
from models.time_field import HHMM
from enum import Enum
import datetime
import uuid

class Weekday(int, Enum):
    MONDAY = 1
    TUESDAY = 2
    WEDNESDAY = 3
    THURSDAY = 4
    FRIDAY = 5
    SATURDAY = 6
    SUNDAY = 7


class CancellationReason(str, Enum):
    BREAK = "break"
    PUBLIC_HOLIDAY = "public_holiday"
    OTHER = "other"

class SafeClassEvent(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")
                              
    id: uuid.UUID =  Field(default_factory=uuid.uuid4)
    subject_id: uuid.UUID
    weekday: Weekday
    start_time: HHMM 
    end_time: HHMM

class ClassEvent(SafeClassEvent):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")
    
    user_id: uuid.UUID


class SafeCancelledClassEvent(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    id: uuid.UUID =  Field(default_factory=uuid.uuid4)
    class_id: uuid.UUID
    date: datetime.datetime
    reason: CancellationReason

class CancelledClassEvent(SafeCancelledClassEvent):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    user_id: uuid.UUID