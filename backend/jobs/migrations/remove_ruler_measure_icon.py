MIGRATION_ID="20260911_01_remove_ruler_measure_icon"

from utils.database import Database

def migrate():
    db = Database()

    result = db.mongo.subjects.update_many(
        {"icon": "RulerMeasure"},
        {"$set": {"icon": "Ruler"}},
    )
    print(f"[MIGRATIONS][{MIGRATION_ID}] Mapped 'RulerMeasure' to 'Ruler' in {result.modified_count} subjects.")

    cache_keys = db.redis.keys("users.subjects:*")
    for key in cache_keys:
        db.redis.delete(key)

    print(f"[MIGRATIONS][{MIGRATION_ID}] Cleared {len(cache_keys)} Redis cache keys related to user subjects.")