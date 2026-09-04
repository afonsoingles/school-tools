from pydantic import BaseModel, Field, ConfigDict
from enum import Enum
import datetime
import uuid


class HomeworkStatus(str, Enum):
    NOT_STARTED = "not_started"
    ONGOING = "ongoing"
    FINISHED = "finished"

class SafeHomework(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    id: uuid.UUID =  Field(default_factory=uuid.uuid4)
    subject_id: uuid.UUID
    title: str
    description: str
    status: HomeworkStatus = HomeworkStatus.NOT_STARTED 
    due_date: datetime.datetime

class Homework(SafeHomework):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    user_id: uuid.UUID
