from pydantic import BaseModel, Field, ConfigDict
from models.time_field import HHMM
from enum import Enum
import datetime
import uuid


class CalendarFeedType(str, Enum):
    CLASSES = "classes"
    EVALUATIONS = "evaluations"

class CalendarFeed(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    id: uuid.UUID =  Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    calendar_type: CalendarFeedType
    ics_content: str

class CalendarFeedSettings(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    id: uuid.UUID =  Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    token_classes: str | None = None
    token_evaluations: str | None = None