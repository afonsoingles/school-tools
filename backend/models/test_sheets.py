from pydantic import BaseModel, Field, ConfigDict, field_validator
from enum import Enum
import datetime
import uuid


LOW_STOCK_THRESHOLD = 5


class TestSheetType(str, Enum):
    LINED = "lined"
    GRAPH = "graph"


def _ensure_utc(value):
    if isinstance(value, datetime.datetime) and value.tzinfo is None:
        return value.replace(tzinfo=datetime.timezone.utc)
    return value


class SafeTestSheetStock(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    user_id: uuid.UUID
    enabled: bool = Field(default=False)
    lined: int = Field(default=0, ge=0)
    graph: int = Field(default=0, ge=0)
    granted_at: datetime.datetime | None = Field(default=None)
    updated_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))

    @field_validator("granted_at", "updated_at", mode="before")
    @classmethod
    def _utc(cls, value):
        return _ensure_utc(value)


class TestSheetStock(SafeTestSheetStock):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")


class SafeTestSheetUsage(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    evaluation_id: uuid.UUID
    lined: int = Field(default=0, ge=0)
    graph: int = Field(default=0, ge=0)
    created_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))

    @field_validator("created_at", mode="before")
    @classmethod
    def _utc(cls, value):
        return _ensure_utc(value)


class TestSheetUsage(SafeTestSheetUsage):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")
