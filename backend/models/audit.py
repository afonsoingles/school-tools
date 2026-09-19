from pydantic import BaseModel, Field, ConfigDict, field_serializer
import datetime
import uuid


class SafeAuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    action: str
    resource: str
    resource_id: str | None = None
    summary: str = ""
    via: str = "web"
    created_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))

    @field_serializer("created_at")
    def _ser_created_at(self, v: datetime.datetime) -> str:
        v = v if v.tzinfo else v.replace(tzinfo=datetime.timezone.utc)
        return v.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z")


class AuditLog(SafeAuditLog):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")