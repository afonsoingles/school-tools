MIGRATION_ID="20260831_01_remove_onboarding_field"

from utils.database import Database

def migrate():
    db = Database()
    result = db.mongo.users.update_many({"onboarding_status": {"$exists": True}}, {"$unset": {"onboarding_status": ""}})
    print(f"[{MIGRATION_ID}] Removed 'onboarding_status' field from {result.modified_count} documents.")