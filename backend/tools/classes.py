from models.classes import CancellationReason, ClassEvent, CancelledClassEvent, Weekday
from errors.classes import *
from models.time_field import HHMM
from utils.database import Database
import uuid
from pymongo import ReturnDocument
from tools.calendar import CalendarTools
import json
import datetime

calendar_tools = CalendarTools()

class ClassTools:
    def __init__(self) -> None:
        self.db = Database()
        pass

    def create_class(self, user_id: uuid.UUID, subject: uuid.UUID, weekday: Weekday, start: HHMM, end: HHMM) -> ClassEvent:
        class_event = ClassEvent(user_id=user_id, subject_id=subject, weekday=weekday, start_time=start, end_time=end)
        class_dict = class_event.model_dump()
        class_dict["_id"] = class_event.id

        self.db.mongo.classes.insert_one(class_dict)
        self.db.redis.hset(f"users.classes:{str(user_id)}", str(class_event.id), class_event.model_dump_json())
        self.db.redis.expire(f"users.classes:{str(user_id)}", 7200)
        if self.db.redis.get(f"users.classes.is_empty:{str(user_id)}"):
            self.db.redis.delete(f"users.classes.is_empty:{str(user_id)}")

        calendar_tools.mark_feed_dirty(user_id)

        return ClassEvent.model_validate(class_dict)

    def get_user_class_schedule(self, user_id: uuid.UUID) -> list[ClassEvent]:

        if self.db.redis.get(f"users.classes.is_empty:{str(user_id)}"):
            return []

        cached_classes = self.db.redis.hgetall(f"users.classes:{str(user_id)}")
        if cached_classes:
            return [ClassEvent.model_validate(json.loads(cached_classes[key])) for key in cached_classes]

        classes = self.db.mongo.classes.find({"user_id": user_id})

        class_list = [ClassEvent.model_validate(class_event) for class_event in classes]
        if not class_list:
            self.db.redis.set(f"users.classes.is_empty:{str(user_id)}", "1", ex=7200)
            return []

        self.db.redis.hset(f"users.classes:{str(user_id)}", mapping={str(class_event.id): class_event.model_dump_json() for class_event in class_list})
        self.db.redis.expire(f"users.classes:{str(user_id)}", 7200)

        return class_list

    def delete_class(self, user_id: uuid.UUID, class_id: uuid.UUID) -> ClassEvent | None:
        class_event = self.db.mongo.classes.find_one_and_delete(
            {"id": class_id, "user_id": user_id},
            return_document=ReturnDocument.BEFORE
        )
        if not class_event:
            raise ClassNotFound

        self.db.redis.hdel(f"users.classes:{str(user_id)}", str(class_id))

        calendar_tools.mark_feed_dirty(user_id)

        return ClassEvent.model_validate(class_event)

    def cancel_class(self, user_id: uuid.UUID, class_id: uuid.UUID, date: datetime.datetime, reason: CancellationReason) -> CancelledClassEvent:
        canceled_class = CancelledClassEvent(
            user_id=user_id,
            class_id=class_id,
            date=date,
            reason=reason
        )

        self.db.mongo.class_cancellations.insert_one(canceled_class.model_dump())
        self.db.redis.hset(f"users.class_cancellations:{str(user_id)}", str(canceled_class.id), canceled_class.model_dump_json())
        self.db.redis.expire(f"users.class_cancellations:{str(user_id)}", 7200)
        if self.db.redis.get(f"users.class_cancellations.is_empty:{str(user_id)}"):
            self.db.redis.delete(f"users.class_cancellations.is_empty:{str(user_id)}")

        calendar_tools.mark_feed_dirty(user_id)

        return canceled_class

    def uncancel_class(self, user_id: uuid.UUID, cancellation_id: uuid.UUID) -> None:
        canceled_class = self.db.mongo.class_cancellations.find_one_and_delete(
            {"id": cancellation_id, "user_id": user_id},
            return_document=ReturnDocument.BEFORE
        )
        if not canceled_class:
            raise CancellationNotFound
        
        self.db.redis.hdel(f"users.class_cancellations:{str(canceled_class['user_id'])}", str(cancellation_id))

        calendar_tools.mark_feed_dirty(canceled_class['user_id'])
        
        return

    def get_user_canceled_classes(self, user_id: uuid.UUID)-> list[CancelledClassEvent]:
        if self.db.redis.get(f"users.class_cancellations.is_empty:{str(user_id)}"):
            return []

        cached = self.db.redis.hgetall(f"users.class_cancellations:{str(user_id)}")
        if cached:
            return [CancelledClassEvent.model_validate(json.loads(cached[key])) for key in cached]

        canceled_classes = self.db.mongo.class_cancellations.find({"user_id": user_id})
        canceled_class_list = [CancelledClassEvent.model_validate(canceled_class) for canceled_class in canceled_classes]
        if not canceled_class_list:
            self.db.redis.set(f"users.class_cancellations.is_empty:{str(user_id)}", "1", ex=7200)
            return []

        self.db.redis.hset(f"users.class_cancellations:{str(user_id)}", mapping={str(canceled_class.id): canceled_class.model_dump_json() for canceled_class in canceled_class_list})
        self.db.redis.expire(f"users.class_cancellations:{str(user_id)}", 7200)

        return canceled_class_list
        