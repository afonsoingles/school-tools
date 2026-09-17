from utils.database import Database
from utils.holidays import country_for_timezone, public_holiday_dates
from models.holidays import HolidaySettings
from tools.calendar import CalendarTools
from tools.users import UserTools
import uuid
import datetime
import json

class HolidayTools:
    def __init__(self) -> None:
        self.db = Database()
        self.user_tools = UserTools()
        self.calendar_tools = CalendarTools()
        pass

    def _write_settings(self, user_id: uuid.UUID, settings: HolidaySettings) -> None:
        self.db.mongo.users.update_one(
            {"id": user_id},
            {"$set": {"settings.holidays": settings.model_dump()}},
        )
        self.db.redis.set(f"users.holidays.settings:{user_id}", settings.model_dump_json(), ex=21600)
        # The settings live inside the users document, so the user cache is stale.
        self.db.redis.delete(f"users.user:{user_id}")
        self.calendar_tools.mark_feed_dirty(user_id)

    def get_settings(self, user_id: uuid.UUID) -> HolidaySettings:
        cached = self.db.redis.get(f"users.holidays.settings:{user_id}")
        if cached:
            return HolidaySettings.model_validate(json.loads(cached))

        raw_user = self.db.mongo.users.find_one({"id": user_id})
        settings = HolidaySettings()
        if raw_user:
            settings = HolidaySettings.model_validate(raw_user.get("settings", {}).get("holidays", {}))
        self.db.redis.set(f"users.holidays.settings:{user_id}", settings.model_dump_json(), ex=21600)

        return settings

    def get_holiday_country(self, user_id: uuid.UUID) -> str | None:
        try:
            user = self.user_tools.get_user_by_id(user_id)
        except Exception:
            return None
        return country_for_timezone(str(user.timezone))

    def set_auto_cancel(self, user_id: uuid.UUID, enabled: bool) -> HolidaySettings:
        settings = self.get_settings(user_id)
        settings.auto_cancel_enabled = enabled
        self._write_settings(user_id, settings)
        return settings

    def add_override(self, user_id: uuid.UUID, date: datetime.date) -> HolidaySettings:
        settings = self.get_settings(user_id)
        iso = date.isoformat()
        if iso not in settings.overrides:
            settings.overrides.append(iso)
            self._write_settings(user_id, settings)
        return settings

    def remove_override(self, user_id: uuid.UUID, date: datetime.date) -> HolidaySettings:
        settings = self.get_settings(user_id)
        iso = date.isoformat()
        if iso in settings.overrides:
            settings.overrides.remove(iso)
            self._write_settings(user_id, settings)
        return settings

    def get_auto_holiday_dates(self, user_id: uuid.UUID, start: datetime.date, end: datetime.date) -> list[str]:
        
        settings = self.get_settings(user_id)
        if not settings.auto_cancel_enabled:
            return []

        country = self.get_holiday_country(user_id)
        if not country:
            return []

        holidays = public_holiday_dates(country, start, end)
        overrides = set(settings.overrides)

        return sorted(h.isoformat() for h in holidays if h.isoformat() not in overrides)