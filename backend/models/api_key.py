from pydantic import BaseModel, Field, ConfigDict
import datetime
import uuid


class ApiKey(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    name: str
    key_hash: str
    prefix: str
    created_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))
    last_used_at: datetime.datetime | None = None
    revoked: bool = Field(default=False)


class SafeApiKey(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    prefix: str
    created_at: datetime.datetime
    last_used_at: datetime.datetime | None = None
    revoked: bool