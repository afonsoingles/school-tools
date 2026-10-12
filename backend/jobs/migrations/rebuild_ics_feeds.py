MIGRATION_ID = "20261012_01_rebuild_ics_feeds"

from utils.database import Database
from tools.calendar import CalendarTools
from models.calendar import CalendarFeedType
import uuid


def _as_uuid(value):
    if isinstance(value, uuid.UUID):
        return value
    if isinstance(value, bytes):
        try:
            return uuid.UUID(bytes=bytes(value))
        except Exception:
            pass
    return uuid.UUID(str(value))


def migrate():
    db = Database()
    calendar_tools = CalendarTools()

    # Rebuild the ICS feeds after the evaluation/schedule exdate fix:
    # every user with a cached feed is queued for regeneration by the
    # calendar.generate_pending_feeds job, and stale feed caches are dropped.
    user_ids = db.mongo.calendar_feeds.distinct("user_id")
    marked = 0
    for user_id in user_ids:
        uid = _as_uuid(user_id)
        calendar_tools.mark_feed_dirty(uid)
        for feed_type in CalendarFeedType:
            db.redis.delete(f"users.calendar.feeds.{feed_type.value}:{uid}")
        marked += 1

    print(f"[MIGRATIONS][{MIGRATION_ID}] Marked {marked} users for ICS feed regeneration.")