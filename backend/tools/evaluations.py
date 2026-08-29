from models.evaluation import EvaluationType, Evaluation
from errors.evaluations import *
from models.time_field import HHMM
from utils.database import Database
import uuid
from pymongo import ReturnDocument
import json
import datetime
from tools.calendar import CalendarTools

calendar_tools = CalendarTools()

class EvaluationTools:
    def __init__(self) -> None:
        self.db = Database()
        pass

    def create_evaluation(self, user_id: uuid.UUID, class_id: uuid.UUID, date: datetime.datetime, type: EvaluationType) -> Evaluation:
        evaluation = Evaluation(user_id=user_id, class_id=class_id, date=date, type=type)
        evaluation_dict = evaluation.model_dump()
        evaluation_dict["_id"] = evaluation.id

        self.db.mongo.evaluations.insert_one(evaluation_dict)
        self.db.redis.hset(f"users.evaluations:{str(user_id)}", str(evaluation.id), evaluation.model_dump_json())
        self.db.redis.expire(f"users.evaluations:{str(user_id)}", 7200)
        if self.db.redis.get(f"users.evaluations.is_empty:{str(user_id)}"):
            self.db.redis.delete(f"users.evaluations.is_empty:{str(user_id)}")

        calendar_tools.mark_feed_dirty(user_id)

        return Evaluation.model_validate(evaluation_dict)

    def get_user_evaluations(self, user_id: uuid.UUID) -> list[Evaluation]:

        if self.db.redis.get(f"users.evaluations.is_empty:{str(user_id)}"):
            return []

        cached = self.db.redis.hgetall(f"users.evaluations:{str(user_id)}")
        if cached:
            return [Evaluation.model_validate(json.loads(cached[key])) for key in cached]

        evaluations = self.db.mongo.evaluations.find({"user_id": user_id})

        evaluation_list = [Evaluation.model_validate(evaluation) for evaluation in evaluations]
        if not evaluation_list:
            self.db.redis.set(f"users.evaluations.is_empty:{str(user_id)}", "1", ex=7200)
            return []

        self.db.redis.hset(f"users.evaluations:{str(user_id)}", mapping={str(evaluation.id): evaluation.model_dump_json() for evaluation in evaluation_list})
        self.db.redis.expire(f"users.evaluations:{str(user_id)}", 7200)

        return evaluation_list

    def delete_evaluation(self, user_id: uuid.UUID, evaluation_id: uuid.UUID) -> Evaluation | None:
        evaluation = self.db.mongo.evaluations.find_one_and_delete(
            {"id": evaluation_id, "user_id": user_id},
            return_document=ReturnDocument.BEFORE
        )
        if not evaluation:
            raise EvaluationNotFound

        self.db.redis.hdel(f"users.evaluations:{str(user_id)}", str(evaluation_id))

        calendar_tools.mark_feed_dirty(user_id)

        return Evaluation.model_validate(evaluation)