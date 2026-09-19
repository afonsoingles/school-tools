from pydantic import BaseModel, Field, ConfigDict, field_serializer
from enum import Enum
import datetime
import uuid


class NotificationType(str, Enum):
    EVALUATION = "evaluation"
    HOMEWORK = "homework"
    HOLIDAY = "holiday"
    CANCELLED_CLASS = "cancelled_class"
    ADMIN = "admin"
    TEST_SHEET_STOCK = "test_sheet_stock"
    TEST_SHEET_RECONCILE = "test_sheet_reconcile"
    DELETION = "deletion"


class SafeNotification(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    type: NotificationType
    title: str
    body: str
    deep_link: str | None = None
    read: bool = Field(default=False)
    created_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))
    pushed_at: datetime.datetime | None = None

    @field_serializer("created_at")
    def _ser_created_at(self, v: datetime.datetime) -> str:
        v = v if v.tzinfo else v.replace(tzinfo=datetime.timezone.utc)
        return v.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z")

    @field_serializer("pushed_at")
    def _ser_pushed_at(self, v: datetime.datetime | None) -> str | None:
        if v is None:
            return None
        v = v if v.tzinfo else v.replace(tzinfo=datetime.timezone.utc)
        return v.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z")


class Notification(SafeNotification):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")


class PushSubscription(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    endpoint: str
    p256dh: str
    auth: str
    enabled: bool = Field(default=True)
    device_label: str | None = None
    created_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))