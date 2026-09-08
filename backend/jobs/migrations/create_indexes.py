MIGRATION_ID="20260908_01_create_indexes"

from utils.database import Database
from pymongo import IndexModel, ASCENDING

def migrate():
    db = Database()

    #users
    db.mongo.users.create_indexes([
        IndexModel([("id", ASCENDING)], unique=True, name="idx_id"),
        IndexModel([("email", ASCENDING)], unique=True, name="idx_email"),
    ])
    print(f"[MIGRATIONS][{MIGRATION_ID}] Created indexes for users successfully.")

    #subjects
    db.mongo.subjects.create_indexes([
        IndexModel([("id", ASCENDING)], unique=True, name="idx_id"),
        IndexModel([("user_id", ASCENDING)], name="idx_user_id"),
    ])
    print(f"[MIGRATIONS][{MIGRATION_ID}] Created indexes for subjects successfully.")

    # class events
    db.mongo.classes.create_indexes([
        IndexModel([("id", ASCENDING)], unique=True, name="idx_id"),
        IndexModel([("user_id", ASCENDING)], name="idx_user_id"),
        IndexModel([("subject_id", ASCENDING)], name="idx_subject_id"),
    ])
    print(f"[MIGRATIONS][{MIGRATION_ID}] Created indexes for classes successfully.")

    # cancelled classes
    db.mongo.class_camcellations.create_indexes([
        IndexModel([("id", ASCENDING)], unique=True, name="idx_id"),
        IndexModel([("user_id", ASCENDING), ("date", ASCENDING)], name="idx_user_date"),
        IndexModel([("class_id", ASCENDING)], name="idx_class_id")
    ])
    print(f"[MIGRATIONS][{MIGRATION_ID}] Created indexes for class cancellations successfully.")

    # evaluations
    db.mongo.evaluations.create_indexes([
        IndexModel([("id", ASCENDING)], unique=True, name="idx_id"),
        IndexModel([("user_id", ASCENDING), ("date", ASCENDING)], name="idx_user_date"),
        IndexModel([("class_id", ASCENDING)], name="idx_class_id"),
    ])

    # homework
    db.mongo.homework.create_indexes([
        IndexModel([("id", ASCENDING)], unique=True, name="idx_id"),
        IndexModel([("user_id", ASCENDING), ("due_date", ASCENDING)], name="idx_user_due_date"),
        IndexModel([("subject_id", ASCENDING)], name="idx_subject_id"),
    ])
    print(f"[MIGRATIONS][{MIGRATION_ID}] Created indexes for homework successfully.")

    # calendar feeds
    db.mongo.calendar_feeds.create_indexes([
        IndexModel([("id", ASCENDING)], unique=True, name="idx_id"),
        IndexModel([("user_id", ASCENDING), ("calendar_type", ASCENDING)], unique=True, name="idx_user_type"),
    ])
    print(f"[MIGRATIONS][{MIGRATION_ID}] Created indexes for calendar feeds successfully.")

    # calendar feed settings
    db.mongo.calendar_feed_settings.create_indexes([
        IndexModel([("id", ASCENDING)], unique=True, name="idx_id"),
        IndexModel([("user_id", ASCENDING), ("calendar_feed_id", ASCENDING)], unique=True, name="idx_user_feed"),
    ])
    print(f"[MIGRATIONS][{MIGRATION_ID}] Created indexes for calendar feed settings successfully.")