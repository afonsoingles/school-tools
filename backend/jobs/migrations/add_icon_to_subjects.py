MIGRATION_ID="20260902_01_add_icon_to_subjects"

from utils.database import Database

def migrate():
    db = Database()

    result = db.mongo.subjects.update_many({}, {"$set": {"icon": "BookOpen"}})
    print(f"[MIGRATIONS][{MIGRATION_ID}] Added 'icon' field with default value 'BookOpen' to {result.modified_count} subjects.")

    cache_keys = db.redis.keys("users.subjects:*")
    for key in cache_keys:
        db.redis.delete(key)

    print(f"[MIGRATIONS][{MIGRATION_ID}] Cleared {len(cache_keys)} Redis cache keys related to user subjects.")
