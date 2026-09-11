MIGRATION_ID="20260911_02_add_user_list_indexes"

from utils.database import Database
from pymongo import IndexModel, ASCENDING, DESCENDING

def migrate():
    db = Database()

    db.mongo.users.create_indexes([
        IndexModel([("created_at", DESCENDING)], name="idx_created_at"),
        IndexModel([("active", ASCENDING), ("created_at", DESCENDING)], name="idx_active_created_at"),
        IndexModel([("email_verified", ASCENDING), ("created_at", DESCENDING)], name="idx_verified_created_at"),
    ])
    print(f"[MIGRATIONS][{MIGRATION_ID}] Created indexes for the admin user list successfully.")