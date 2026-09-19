from pydantic import BaseModel, EmailStr, SecretStr, AwareDatetime, Field, PlainSerializer, ConfigDict, field_serializer, computed_field
from pydantic_extra_types.timezone_name import TimeZoneName
from typing_extensions import Annotated
from models.calendar import CalendarFeedSettings
from models.holidays import HolidaySettings
from utils.locale import locale_for_timezone
import datetime
import uuid


class NotificationSettings(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    enabled: bool = Field(default=False)


class UserSettings(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    calendar: CalendarFeedSettings = Field(default_factory=CalendarFeedSettings)
    holidays: HolidaySettings = Field(default_factory=HolidaySettings)
    notifications: NotificationSettings = Field(default_factory=NotificationSettings)


class SafeUser(BaseModel):

    model_config = ConfigDict(extra="ignore", revalidate_instances="always")
                             
    id: uuid.UUID =  Field(default_factory=uuid.uuid4)
    name: str
    email: EmailStr
    email_verified: bool = Field(default=False)
    active: bool = Field(default=True)
    admin: bool = Field(default=False)
    superadmin: bool = Field(default=False) 
    timezone: TimeZoneName = Field(default_factory=lambda: TimeZoneName("Etc/Universal"))
    created_at: Annotated[AwareDatetime, PlainSerializer(lambda v: v.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z"), return_type=str)] = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at: Annotated[AwareDatetime, PlainSerializer(lambda v: v.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z"), return_type=str)] = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))

    @computed_field
    @property
    def locale(self) -> str:
        return locale_for_timezone(str(self.timezone))

class User(SafeUser):
    """Full users document: password + embedded settings live only server-side."""

    password: SecretStr
    settings: UserSettings = Field(default_factory=UserSettings)

    @field_serializer("password")
    def serialize_password(self, value: SecretStr) -> str:
        return value.get_secret_value()


