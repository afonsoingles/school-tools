from models.homework import *
from errors.homework import *
from errors.base import *
from utils.database import Database
import uuid
from pymongo import ReturnDocument
import json
import datetime



class HomeworkTools:
    def __init__(self) -> None:
        self.db = Database()
        pass

    def create_homework(self, homework: Homework) -> Homework:

        dict = homework.model_dump()
        dict["_id"] = homework.id

        self.db.mongo.homework.insert_one(dict)
        self.db.redis.hset(f"users.homework:{str(homework.user_id)}", str(homework.id), homework.model_dump_json())
        self.db.redis.expire(f"users.homework:{str(homework.user_id)}", 7200)
        if self.db.redis.get(f"users.homework.is_empty:{str(homework.user_id)}"):
            self.db.redis.delete(f"users.homework.is_empty:{str(homework.user_id)}")

        return Homework.model_validate(dict)

    def get_user_homeworks(self, user_id: uuid.UUID) -> list[SafeHomework]:
    
        if self.db.redis.get(f"users.homework.is_empty:{str(user_id)}"):
            return []

        cached_homeworks = self.db.redis.hgetall(f"users.homework:{str(user_id)}")
        if cached_homeworks:
            return [SafeHomework.model_validate(json.loads(cached_homeworks[key])) for key in cached_homeworks]

        raw = self.db.mongo.homework.find({"user_id": user_id})
        homework_list = [Homework.model_validate(homework) for homework in raw]
        if not homework_list:
            self.db.redis.set(f"users.homework.is_empty:{str(user_id)}", "1", ex=7200)
            return []
        safe_homework_list = [SafeHomework.model_validate(s.model_dump()) for s in homework_list]

        self.db.redis.hset(f"users.homework:{str(user_id)}", mapping={str(homework.id): homework.model_dump_json() for homework in homework_list})
        self.db.redis.expire(f"users.homework:{str(user_id)}", 7200)

        return safe_homework_list

    def delete_homework(self, user_id: uuid.UUID, homework_id: uuid.UUID) -> Homework | None:

        homework = self.db.mongo.homework.find_one_and_delete({"id": homework_id, "user_id": user_id}, return_document=ReturnDocument.BEFORE)

        if not homework:
            return None

        self.db.redis.hdel(f"users.homework:{str(user_id)}", str(homework_id))
        if not self.db.redis.hlen(f"users.homework:{str(user_id)}"):
            self.db.redis.set(f"users.homework.is_empty:{str(user_id)}", "1", ex=7200)

        return Homework.model_validate(homework)

    def update_homework(self, user_id: uuid.UUID, homework_id: uuid.UUID, update_data: dict) -> Homework:

        if "user_id" in update_data or "id" in update_data:
            raise ImmutableField

        current_homework = self.db.mongo.homework.find_one({"id": homework_id, "user_id": user_id})
        if not current_homework:
            raise HomeworkNotFound
        
        try:
            updated_homework = Homework.model_validate({**current_homework, **update_data})
        except:
            raise Exception("Failed to validate updated homework data.")

        self.db.mongo.homework.find_one_and_update(
            {"id": homework_id, "user_id": user_id},
            {"$set": update_data},
        )


        self.db.redis.hset(f"users.homework:{str(user_id)}", str(homework_id), updated_homework.model_dump_json())

        return updated_homework
