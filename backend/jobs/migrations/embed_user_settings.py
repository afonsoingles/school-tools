MIGRATION_ID="20260915_02_embed_user_settings"

from utils.database import Database
from pymongo import IndexModel, ASCENDING
from models.calendar import CalendarFeedSettings


def migrate():
    db = Database()

    # 1. Carry existing calendar feed settings into the embedded users.settings.calendar.
    #    Tokens are preserved so existing subscription URLs keep working.
    migrated = 0
    for doc in db.mongo.calendar_feed_settings.find({}):
        user_id = doc.get("user_id")
        if not user_id:
            continue

        calendar = CalendarFeedSettings(
            is_enabled=bool(doc.get("is_enabled", False)),
            token_classes=doc.get("token_classes"),
            token_evaluations=doc.get("token_evaluations"),
        )
        result = db.mongo.users.update_one(
            {"id": user_id},
            {"$set": {"settings.calendar": calendar.model_dump()}},
        )
        if result.matched_count:
            migrated += 1

    # 2. Backfill defaults for users that never had calendar settings.
    db.mongo.users.update_many(
        {"settings": {"$exists": False}},
        {"$set": {"settings": {"calendar": CalendarFeedSettings().model_dump()}}},
    )

    # 3. Index backing the adoption stats count (settings.calendar.is_enabled).
    db.mongo.users.create_indexes([
        IndexModel([("settings.calendar.is_enabled", ASCENDING)], name="idx_settings_calendar_enabled"),
    ])

    # 4. Invalidate caches that may hold pre-migration / stale user payloads.
    for key in db.redis.scan_iter("users.calendar.settings:*"):
        db.redis.delete(key)
    for key in db.redis.scan_iter("users.user:*"):
        db.redis.delete(key)
    for key in db.redis.scan_iter("users.lookup.email:*"):
        db.redis.delete(key)

    db.mongo.calendar_feed_settings.drop()
    print(f"[MIGRATIONS][{MIGRATION_ID}] Embedded calendar settings into users for {migrated} legacy docs.")