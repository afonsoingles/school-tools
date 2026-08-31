from utils.database import Database
import uuid
import secrets
from models.calendar import *
import json

class CalendarTools:
    def __init__(self) -> None:
        self.db = Database()
        pass

    def save_calendar_feed(self, user_id: uuid.UUID, calendar_type: CalendarFeedType, ics_content: str) -> None:

        calendar = CalendarFeed(
            user_id=user_id,
            calendar_type=calendar_type,
            ics_content=ics_content
        )
        calendar_dict = calendar.model_dump()
        self.db.mongo.calendar_feeds.update_one({"user_id": user_id, "calendar_type": calendar_type}, {"$set": calendar_dict}, upsert=True)

        self.db.redis.set(f"users.calendar.feeds.{calendar_type.value}:{user_id}", ics_content, ex=21600)

    def get_calendar_feed(self, user_id: uuid.UUID, calendar_type: CalendarFeedType):
        cached = self.db.redis.get(f"users.calendar.feeds.{calendar_type.value}:{user_id}")
        if cached:
            return cached

        calendar_feed = self.db.mongo.calendar_feeds.find_one({"user_id": user_id, "calendar_type": calendar_type})
        if not calendar_feed:
            return None

        self.db.redis.set(f"users.calendar.feeds.{calendar_type.value}:{user_id}", calendar_feed["ics_content"], ex=21600)

        return calendar_feed["ics_content"]

    def generate_calendar_tokens(self, user_id: uuid.UUID) -> CalendarFeedSettings:
        settings = CalendarFeedSettings(
            user_id=user_id,
            token_classes=secrets.token_urlsafe(64),
            token_evaluations=secrets.token_urlsafe(64)
        )
        settings_dict = settings.model_dump()
        self.db.mongo.calendar_feed_settings.update_one({"user_id": user_id}, {"$set": settings_dict}, upsert=True)
        self.db.redis.set(f"users.calendar.settings:{user_id}", settings.model_dump_json(), ex=21600)

        return settings

    def get_calendar_tokens(self, user_id: uuid.UUID) -> CalendarFeedSettings | None:
        cached = self.db.redis.get(f"users.calendar.settings:{user_id}")
        if cached:
            return CalendarFeedSettings.model_validate(json.loads(cached))

        settings = self.db.mongo.calendar_feed_settings.find_one({"user_id": user_id})
        if not settings:
            return None

        return CalendarFeedSettings.model_validate(settings)

    def mark_feed_dirty(self, user_id: uuid.UUID) -> None:
        self.db.redis.sadd(f"users.calendar.dirty", str(user_id))
        self.db.redis.incr(f"users.calendar.dirty.count:{str(user_id)}", 1)

    def is_valid_feed_request(self, user_id: uuid.UUID, token: str, type: CalendarFeedType) -> bool:
        settings = self.get_calendar_tokens(user_id)
        if not settings:
            return False
        try:
            if type == CalendarFeedType.CLASSES:
                return secrets.compare_digest(str(token), str(settings.token_classes))
            else:
                return secrets.compare_digest(str(token), str(settings.token_evaluations))
        except Exception:
            return False

    def get_dirty_users(self) -> list[uuid.UUID]:
        dirty_users = self.db.redis.smembers(f"users.calendar.dirty")
        return [uuid.UUID(user_id.decode() if isinstance(user_id, bytes) else user_id) for user_id in dirty_users]

    def get_user_dirty_count(self, user_id: uuid.UUID) -> int:
        count = self.db.redis.get(f"users.calendar.dirty.count:{str(user_id)}")
        return int(count) if count else 0

    def clear_user_dirty(self, user_id: uuid.UUID) -> None:
        self.db.redis.srem(f"users.calendar.dirty", str(user_id))
        self.db.redis.delete(f"users.calendar.dirty.count:{str(user_id)}")