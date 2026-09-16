MIGRATION_ID="20260916_02_add_color_to_subjects"

from utils.database import Database

def migrate():
    db = Database()

    result = db.mongo.subjects.update_many({}, {"$set": {"color": "blue"}})
    print(f"[MIGRATIONS][{MIGRATION_ID}] Added 'color' field with default value 'blue' to {result.modified_count} subjects.")

    cache_keys = db.redis.keys("users.subjects:*")
    for key in cache_keys:
        db.redis.delete(key)

    print(f"[MIGRATIONS][{MIGRATION_ID}] Cleared {len(cache_keys)} Redis cache keys related to user subjects.")