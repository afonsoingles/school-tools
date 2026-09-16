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


class SafeClassSchedule(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    chain_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    scheduled_weekday: Weekday
    start_time: HHMM
    end_time: HHMM
    valid_from: datetime.date
    valid_until: datetime.date | None = None


class SafeClassCancellation(BaseModel):

    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    date: datetime.date
    reason: CancellationReason
    note: str | None = None


class SafeClassEvent(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    subject_id: uuid.UUID
    schedules: list[SafeClassSchedule] = Field(default_factory=list)
    cancellations: list[SafeClassCancellation] = Field(default_factory=list)


class ClassEvent(SafeClassEvent):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    user_id: uuid.UUID


class SafeDayCancellation(BaseModel):

    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    date: datetime.date
    reason: CancellationReason
    note: str | None = None


class DayCancellation(SafeDayCancellation):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    user_id: uuid.UUID


class SafeCancelledClassEvent(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    class_id: uuid.UUID | None = None
    date: datetime.date
    reason: CancellationReason
    note: str | None = None