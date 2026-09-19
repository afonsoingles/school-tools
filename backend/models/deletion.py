from pydantic import BaseModel, Field, ConfigDict, field_validator
from enum import Enum
import datetime
import uuid


class DeletionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REVERSED = "reversed"
    COMPLETED = "completed"


class SafeDeletionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    email: str
    name: str
    reason: str = Field(default="")
    status: DeletionStatus = Field(default=DeletionStatus.PENDING)
    nominated: bool = Field(default=False)
    requested_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))
    reviewed_at: datetime.datetime | None = Field(default=None)
    reviewed_by: uuid.UUID | None = Field(default=None)
    scheduled_purge_at: datetime.datetime | None = Field(default=None)
    reversed_at: datetime.datetime | None = Field(default=None)
    completed_at: datetime.datetime | None = Field(default=None)

    @field_validator("requested_at", "reviewed_at", "scheduled_purge_at", "reversed_at", "completed_at", mode="before")
    @classmethod
    def _ensure_utc(cls, value):
        if isinstance(value, datetime.datetime) and value.tzinfo is None:
            return value.replace(tzinfo=datetime.timezone.utc)
        return value


class DeletionRequest(SafeDeletionRequest):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")
