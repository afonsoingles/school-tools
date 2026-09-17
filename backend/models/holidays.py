from pydantic import BaseModel, Field, ConfigDict


class HolidaySettings(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")

    auto_cancel_enabled: bool = False
    overrides: list[str] = Field(default_factory=list)