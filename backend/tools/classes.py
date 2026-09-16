from models.classes import CancellationReason, ClassEvent, DayCancellation, SafeCancelledClassEvent, SafeClassSchedule, Weekday
from errors.classes import *
from models.time_field import HHMM
from utils.database import Database
import uuid
from pymongo import ReturnDocument
from tools.calendar import CalendarTools
from tools.evaluations import EvaluationTools
import json
import datetime

calendar_tools = CalendarTools()
evaluation_tools = EvaluationTools()


def _prepare_mongo(model) -> dict:
    """model_dump() with datetime.date values converted to ISO strings.

    Motor encodes UUIDs (uuidRepresentation=standard) and datetimes, but refuses
    native date objects; date fields are stored as "YYYY-MM-DD" strings like the
    rest of the app, and the models parse them back on read.
    """

    def convert(value):
        if isinstance(value, datetime.date):
            return value.isoformat()
        if isinstance(value, list):
            return [convert(item) for item in value]
        if isinstance(value, dict):
            return {key: convert(item) for key, item in value.items()}
        return value

    return convert(model.model_dump())


def _active_schedule(class_event: ClassEvent, date: datetime.date) -> SafeClassSchedule | None:
    """Schedule entry effective on the given date (latest valid_from <= date)."""
    matches = [
        s for s in class_event.schedules
        if s.valid_from <= date and (s.valid_until is None or s.valid_until >= date)
    ]
    if not matches:
        return None
    return max(matches, key=lambda s: s.valid_from)


class ClassTools:
    def __init__(self) -> None:
        self.db = Database()
        pass

    # ----- helpers -----

    def _fetch_class(self, user_id: uuid.UUID, class_id: uuid.UUID) -> ClassEvent:
        raw = self.db.mongo.classes.find_one({"id": class_id, "user_id": user_id})
        if not raw:
            raise ClassNotFound
        return ClassEvent.model_validate(raw)

    def _cache_class(self, user_id: uuid.UUID, class_event: ClassEvent) -> None:
        self.db.redis.hset(f"users.classes:{str(user_id)}", str(class_event.id), class_event.model_dump_json())
        self.db.redis.expire(f"users.classes:{str(user_id)}", 7200)
        if self.db.redis.get(f"users.classes.is_empty:{str(user_id)}"):
            self.db.redis.delete(f"users.classes.is_empty:{str(user_id)}")

    def _update_class(self, user_id: uuid.UUID, class_id: uuid.UUID, class_event: ClassEvent) -> ClassEvent:
        class_event.schedules.sort(key=lambda s: s.valid_from)
        self.db.mongo.classes.update_one(
            {"id": class_id, "user_id": user_id},
            {"$set": _prepare_mongo(class_event)},
        )
        self._cache_class(user_id, class_event)
        calendar_tools.mark_feed_dirty(user_id)
        return class_event

    # ----- schedule -----

    def create_class(self, user_id: uuid.UUID, subject: uuid.UUID, schedules: list[dict]) -> ClassEvent:
        if not schedules:
            raise InvalidSchedules

        today = datetime.date.today()
        schedule_list = []
        for s in schedules:
            schedule_list.append(SafeClassSchedule(
                scheduled_weekday=s["scheduled_weekday"],
                start_time=s["start_time"],
                end_time=s["end_time"],
                valid_from=today,
            ))

        class_event = ClassEvent(user_id=user_id, subject_id=subject, schedules=schedule_list)
        class_dict = _prepare_mongo(class_event)
        class_dict["_id"] = class_event.id

        self.db.mongo.classes.insert_one(class_dict)
        self._cache_class(user_id, class_event)

        calendar_tools.mark_feed_dirty(user_id)

        return class_event

    def get_user_class_schedule(self, user_id: uuid.UUID) -> list[ClassEvent]:

        if self.db.redis.get(f"users.classes.is_empty:{str(user_id)}"):
            return []

        cached_classes = self.db.redis.hgetall(f"users.classes:{str(user_id)}")
        if cached_classes:
            return [ClassEvent.model_validate(json.loads(cached_classes[key])) for key in cached_classes]

        classes = self.db.mongo.classes.find({"user_id": user_id})

        class_list = [ClassEvent.model_validate(class_event) for class_event in classes]
        for class_event in class_list:
            class_event.schedules.sort(key=lambda s: s.valid_from)
        if not class_list:
            self.db.redis.set(f"users.classes.is_empty:{str(user_id)}", "1", ex=7200)
            return []

        self.db.redis.hset(f"users.classes:{str(user_id)}", mapping={str(class_event.id): class_event.model_dump_json() for class_event in class_list})
        self.db.redis.expire(f"users.classes:{str(user_id)}", 7200)

        return class_list

    def set_class_subject(self, user_id: uuid.UUID, class_id: uuid.UUID, subject: uuid.UUID) -> ClassEvent:
        class_event = self._fetch_class(user_id, class_id)
        class_event.subject_id = subject
        return self._update_class(user_id, class_id, class_event)

    def add_schedule(self, user_id: uuid.UUID, class_id: uuid.UUID, weekday: Weekday, start: HHMM, end: HHMM, valid_from: datetime.date | None = None) -> ClassEvent:
        class_event = self._fetch_class(user_id, class_id)
        class_event.schedules.append(SafeClassSchedule(
            scheduled_weekday=weekday,
            start_time=start,
            end_time=end,
            valid_from=valid_from or datetime.date.today(),
        ))
        return self._update_class(user_id, class_id, class_event)

    def reschedule_schedule(self, user_id: uuid.UUID, class_id: uuid.UUID, schedule_id: uuid.UUID, weekday: Weekday, start: HHMM, end: HHMM, valid_from: datetime.date | None = None) -> ClassEvent:
        class_event = self._fetch_class(user_id, class_id)
        schedule = next((s for s in class_event.schedules if s.id == schedule_id), None)
        if not schedule:
            raise ScheduleNotFound

        new_valid_from = valid_from or datetime.date.today()
        if new_valid_from <= schedule.valid_from:
            raise InvalidRescheduleDate
        if schedule.valid_until is not None and new_valid_from > schedule.valid_until:
            raise InvalidRescheduleDate

        schedule.valid_until = new_valid_from - datetime.timedelta(days=1)
        class_event.schedules.append(SafeClassSchedule(
            chain_id=schedule.chain_id,
            scheduled_weekday=weekday,
            start_time=start,
            end_time=end,
            valid_from=new_valid_from,
        ))
        return self._update_class(user_id, class_id, class_event)

    def delete_class_schedule(self, user_id: uuid.UUID, class_id: uuid.UUID, schedule_id: uuid.UUID) -> ClassEvent:
        class_event = self._fetch_class(user_id, class_id)
        schedule = next((s for s in class_event.schedules if s.id == schedule_id), None)
        if not schedule:
            raise ScheduleNotFound

        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        if schedule.valid_until is None or schedule.valid_until > yesterday:
            schedule.valid_until = yesterday
        return self._update_class(user_id, class_id, class_event)

    def delete_class(self, user_id: uuid.UUID, class_id: uuid.UUID) -> ClassEvent | None:

        for evaluation in evaluation_tools.get_user_evaluations(user_id):
            if evaluation.class_id == class_id:
                raise ClassUsedByEvaluation

        class_event = self.db.mongo.classes.find_one_and_delete(
            {"id": class_id, "user_id": user_id},
            return_document=ReturnDocument.BEFORE
        )
        if not class_event:
            raise ClassNotFound

        self.db.redis.hdel(f"users.classes:{str(user_id)}", str(class_id))

        calendar_tools.mark_feed_dirty(user_id)

        return ClassEvent.model_validate(class_event)

    # ----- cancellations (embedded per class) -----

    def cancel_class(self, user_id: uuid.UUID, class_id: uuid.UUID, date: datetime.date, reason: CancellationReason, note: str | None = None) -> ClassEvent:
        class_event = self._fetch_class(user_id, class_id)

        for existing in class_event.cancellations:
            if existing.date == date:
                raise ClassAlreadyCancelled

        from models.classes import SafeClassCancellation
        class_event.cancellations.append(SafeClassCancellation(
            date=date,
            reason=reason,
            note=note if reason == CancellationReason.OTHER else None,
        ))
        return self._update_class(user_id, class_id, class_event)

    def uncancel_class(self, user_id: uuid.UUID, class_id: uuid.UUID, cancellation_id: uuid.UUID) -> None:
        class_event = self._fetch_class(user_id, class_id)

        before = len(class_event.cancellations)
        class_event.cancellations = [c for c in class_event.cancellations if c.id != cancellation_id]
        if len(class_event.cancellations) == before:
            raise CancellationNotFound

        self._update_class(user_id, class_id, class_event)
        return

    # ----- day cancellations -----

    def cancel_day(self, user_id: uuid.UUID, date: datetime.date, reason: CancellationReason, note: str | None = None) -> DayCancellation:
        if self.db.mongo.day_cancellations.find_one({"user_id": user_id, "date": date.isoformat()}):
            raise DayAlreadyCancelled

        day_cancellation = DayCancellation(
            user_id=user_id,
            date=date,
            reason=reason,
            note=note if reason == CancellationReason.OTHER else None,
        )
        day_dict = _prepare_mongo(day_cancellation)
        day_dict["_id"] = day_cancellation.id

        self.db.mongo.day_cancellations.insert_one(day_dict)
        self.db.redis.hset(f"users.day_cancellations:{str(user_id)}", str(day_cancellation.id), day_cancellation.model_dump_json())
        self.db.redis.expire(f"users.day_cancellations:{str(user_id)}", 7200)
        if self.db.redis.get(f"users.day_cancellations.is_empty:{str(user_id)}"):
            self.db.redis.delete(f"users.day_cancellations.is_empty:{str(user_id)}")

        calendar_tools.mark_feed_dirty(user_id)

        return day_cancellation

    def uncancel_day(self, user_id: uuid.UUID, day_cancel_id: uuid.UUID) -> None:
        cancelled = self.db.mongo.day_cancellations.find_one_and_delete(
            {"id": day_cancel_id, "user_id": user_id},
            return_document=ReturnDocument.BEFORE
        )
        if not cancelled:
            raise DayCancellationNotFound

        self.db.redis.hdel(f"users.day_cancellations:{str(user_id)}", str(day_cancel_id))

        calendar_tools.mark_feed_dirty(user_id)

        return

    def get_user_day_cancellations(self, user_id: uuid.UUID) -> list[DayCancellation]:
        if self.db.redis.get(f"users.day_cancellations.is_empty:{str(user_id)}"):
            return []

        cached = self.db.redis.hgetall(f"users.day_cancellations:{str(user_id)}")
        if cached:
            return [DayCancellation.model_validate(json.loads(cached[key])) for key in cached]

        day_cancellations = self.db.mongo.day_cancellations.find({"user_id": user_id})
        day_cancellation_list = [DayCancellation.model_validate(d) for d in day_cancellations]
        if not day_cancellation_list:
            self.db.redis.set(f"users.day_cancellations.is_empty:{str(user_id)}", "1", ex=7200)
            return []

        self.db.redis.hset(f"users.day_cancellations:{str(user_id)}", mapping={str(d.id): d.model_dump_json() for d in day_cancellation_list})
        self.db.redis.expire(f"users.day_cancellations:{str(user_id)}", 7200)

        return day_cancellation_list

    # ----- merged view (admin) -----

    def get_user_cancelled_classes(self, user_id: uuid.UUID) -> list[SafeCancelledClassEvent]:
        merged: list[SafeCancelledClassEvent] = []
        for class_event in self.get_user_class_schedule(user_id):
            for cancellation in class_event.cancellations:
                merged.append(SafeCancelledClassEvent(
                    id=cancellation.id,
                    class_id=class_event.id,
                    date=cancellation.date,
                    reason=cancellation.reason,
                    note=cancellation.note,
                ))
        for day_cancellation in self.get_user_day_cancellations(user_id):
            merged.append(SafeCancelledClassEvent(
                id=day_cancellation.id,
                date=day_cancellation.date,
                reason=day_cancellation.reason,
                note=day_cancellation.note,
            ))
        return merged