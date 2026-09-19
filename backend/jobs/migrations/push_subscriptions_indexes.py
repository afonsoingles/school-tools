MIGRATION_ID="20260918_01_push_subscription_indexes"

from utils.database import Database
from pymongo import IndexModel, ASCENDING

def migrate():
    db = Database()

    #push subscriptions (one row per device endpoint per user)
    db.mongo.push_subscriptions.create_indexes([
        IndexModel([("user_id", ASCENDING)], name="idx_user_id"),
        IndexModel([("user_id", ASCENDING), ("endpoint", ASCENDING)], name="idx_user_endpoint"),
    ])
    print(f"[MIGRATIONS][{MIGRATION_ID}] Created indexes for push subscriptions successfully.")