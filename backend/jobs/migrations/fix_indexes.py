MIGRATION_ID="20260915_01_fix_indexes"

from utils.database import Database
from pymongo import IndexModel, ASCENDING

def migrate():
    db = Database()

    # cancelled classes
    db.mongo.class_cancellations.create_indexes([
        IndexModel([("id", ASCENDING)], unique=True, name="idx_id"),
        IndexModel([("user_id", ASCENDING), ("date", ASCENDING)], name="idx_user_date"),
        IndexModel([("class_id", ASCENDING)], name="idx_class_id")
    ])
    db.mongo.class_camcellations.drop_indexes()

    print(f"[MIGRATIONS][{MIGRATION_ID}] Fixed indexes for class cancellations successfully.")

    # homework
    db.mongo.homework.create_indexes([
        IndexModel([("id", ASCENDING)], unique=True, name="idx_id"),
        IndexModel([("user_id", ASCENDING), ("due_date", ASCENDING)], name="idx_user_due_date"),
        IndexModel([("subject_id", ASCENDING)], name="idx_subject_id"),
    ])
    print(f"[MIGRATIONS][{MIGRATION_ID}] Created indexes for homework successfully.")

    # calendar feed settings
    db.mongo.calendar_feed_settings.drop_indexes()
    db.mongo.calendar_feed_settings.create_indexes([
        IndexModel([("id", ASCENDING)], unique=True, name="idx_id"),
        IndexModel([("user_id", ASCENDING)], unique=True, name="idx_user_feed"),
    ])
    print(f"[MIGRATIONS][{MIGRATION_ID}] Fixed indexes for calendar feed settings successfully.")