from pydantic import BaseModel, ConfigDict, PlainSerializer, Field, AwareDatetime
from typing_extensions import Annotated
import datetime

class UserStats(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    total: int
    verified: int
    unverified: int
    active: int
    inactive: int
    new_7d: int
    new_30d: int
    computed_at: Annotated[AwareDatetime, PlainSerializer(lambda v: v.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z"), return_type=str)] = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))

class AdoptionStats(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    homework: int
    evaluations: int
    subjects: int
    classes: int
    cancellations: int
    ics: int
    computed_at: Annotated[AwareDatetime, PlainSerializer(lambda v: v.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z"), return_type=str)] = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))

class FunctionalityStats(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    homework: int
    evaluations: int
    subjects: int
    classes: int
    cancellations: int
    computed_at: Annotated[AwareDatetime, PlainSerializer(lambda v: v.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z"), return_type=str)] = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))