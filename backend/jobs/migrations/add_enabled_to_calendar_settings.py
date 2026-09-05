MIGRATION_ID="20260905_01_add_enabled_to_calendar_settings"

from utils.database import Database

def migrate():
    db = Database()

    result = db.mongo.calendar_feed_settings.update_many({}, {"$set": {"is_enabled": True}})
    # Old users expect their calendars to keep working, so they should still have it enabled by default
    print(f"[MIGRATIONS][{MIGRATION_ID}] Added the is_enabled field to {result.modified_count} users.")

    cache_keys = db.redis.keys("users.calendar.settings:*")
    for key in cache_keys:
        db.redis.delete(key)

    print(f"[MIGRATIONS][{MIGRATION_ID}] Cleared {len(cache_keys)} redis cache keys related to calendar feed settings.")
