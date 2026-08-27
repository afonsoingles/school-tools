from pydantic import BaseModel, EmailStr, SecretStr, AwareDatetime, Field, PlainSerializer, ConfigDict, field_serializer
from typing_extensions import Annotated
import datetime
import uuid


class SafeUser(BaseModel):

    model_config = ConfigDict(extra="ignore", revalidate_instances="always")
                             
    id: uuid.UUID =  Field(default_factory=uuid.uuid4)
    name: str
    email: EmailStr
    email_verified: bool = Field(default=False)
    active: bool = Field(default=True)
    admin: bool = Field(default=False)
    superadmin: bool = Field(default=False) 
    created_at: Annotated[AwareDatetime, PlainSerializer(lambda v: v.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z"), return_type=str)] = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at: Annotated[AwareDatetime, PlainSerializer(lambda v: v.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z"), return_type=str)] = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))

class User(SafeUser):
    password: SecretStr

    @field_serializer("password")
    def serialize_password(self, value: SecretStr) -> str:
        return value.get_secret_value()


