MIGRATION_ID="20260916_01_classes_rework"

from utils.database import Database
from pymongo import IndexModel, ASCENDING
import datetime
import uuid

# Matches the ICS baseline used to generate feeds so far: past behaviour is preserved.
# Stored as an ISO string: the models parse it back to datetime.date, and Motor
# refuses to encode native date/datetime objects.
LEGACY_VALID_FROM = "2026-09-01"


def _normalize_date(value):
    if isinstance(value, datetime.datetime):
        return value.date().isoformat()
    if isinstance(value, datetime.date):
        return value.isoformat()
    return value


def migrate():
    db = Database()

    # 1. Convert legacy classes (single weekday/start/end) into unique class entities
    #    with a schedules array. Each existing slot becomes an open-ended schedule.
    migrated_classes = 0
    for doc in db.mongo.classes.find({"schedules": {"$exists": False}}):
        schedule_id = uuid.uuid4()
        schedules = [{
            "id": schedule_id,
            "chain_id": schedule_id,
            "scheduled_weekday": doc["weekday"],
            "start_time": doc["start_time"].strftime("%H:%M") if hasattr(doc.get("start_time"), "strftime") else doc["start_time"],
            "end_time": doc["end_time"].strftime("%H:%M") if hasattr(doc.get("end_time"), "strftime") else doc["end_time"],
            "valid_from": LEGACY_VALID_FROM,
            "valid_until": None,
        }]
        db.mongo.classes.update_one(
            {"id": doc["id"]},
            {"$set": {"schedules": schedules, "cancellations": []}, "$unset": {"weekday": "", "start_time": "", "end_time": ""}},
        )
        migrated_classes += 1

    # 2. Move the legacy class_cancellations collection into the classes documents.
    embedded = 0
    for cancellation in db.mongo.class_cancellations.find({}):
        class_doc = db.mongo.classes.find_one({"id": cancellation.get("class_id"), "user_id": cancellation.get("user_id")})
        if not class_doc:
            continue

        cancel_date = _normalize_date(cancellation.get("date"))
        existing_dates = {_normalize_date(c.get("date")) for c in class_doc.get("cancellations", [])}
        if cancel_date in existing_dates:
            continue

        db.mongo.classes.update_one(
            {"id": class_doc["id"]},
            {"$push": {"cancellations": {
                "id": cancellation["id"],
                "date": cancel_date,
                "reason": cancellation.get("reason"),
                "note": None,
            }}},
        )
        embedded += 1

    # 3. day_cancellations is a new collection; make sure its indexes exist.
    db.mongo.day_cancellations.create_indexes([
        IndexModel([("id", ASCENDING)], unique=True, name="idx_day_cancellations_id"),
        IndexModel([("user_id", ASCENDING), ("date", ASCENDING)], name="idx_day_cancellations_user_date"),
    ])

    # 4. Classes are cached in redis; drop every classes-related key so new shapes load.
    for pattern in ("users.classes:*", "users.class_cancellations:*", "users.day_cancellations:*"):
        for key in db.redis.scan_iter(pattern):
            db.redis.delete(key)

    print(f"[MIGRATIONS][{MIGRATION_ID}] Reworked {migrated_classes} classes into schedules; embedded {embedded} cancellations.")