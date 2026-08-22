from models.subject import Subject, SafeSubject
from utils.database import Database
import uuid
from pymongo import ReturnDocument
import json

class SubjectTools:
    def __init__(self) -> None:
        self.db = Database()
        pass

    def create_subject(self, user_id: uuid.UUID, name: str) -> SafeSubject:
        subject = Subject(user_id=user_id, name=name)

        subject_dict = subject.model_dump()
        subject_dict["_id"] = subject.id

        self.db.mongo.subjects.insert_one(subject_dict)

        self.db.redis.hset(f"users.subjects:{str(user_id)}", str(subject.id), subject.name)
        self.db.redis.expire(f"users.subjects:{str(user_id)}", 7200)
        if self.db.redis.get(f"users.subjects.is_empty:{str(user_id)}"):
            self.db.redis.delete(f"users.subjects.is_empty:{str(user_id)}")


        return SafeSubject.model_validate(subject_dict)

    def get_user_subjects(self, user_id: uuid.UUID) -> list[SafeSubject]:
        if self.db.redis.get(f"users.subjects.is_empty:{str(user_id)}"):
            return []
        subjects = self.db.redis.hgetall(f"users.subjects:{str(user_id)}")
        if subjects:
            return [
                SafeSubject(
                    id=uuid.UUID(k.decode() if isinstance(k, bytes) else k),
                    name=v.decode() if isinstance(v, bytes) else v,
                )
                for k, v in subjects.items()
            ]

        subjects = self.db.mongo.subjects.find({"user_id": user_id})
        subjects_list = [
            SafeSubject.model_validate(subject) for subject in subjects
        ]
        if subjects_list:
            self.db.redis.hset(f"users.subjects:{str(user_id)}", mapping={str(subject.id): subject.name for subject in subjects_list})
            self.db.redis.expire(f"users.subjects:{str(user_id)}", 7200)
        else:
            self.db.redis.set(f"users.subjects.is_empty:{str(user_id)}", "", ex=7200)


        return subjects_list

    def delete_subject(self, user_id: uuid.UUID, subject_id: str) -> SafeSubject | None:
        subject = self.db.mongo.subjects.find_one_and_delete(
            {"id": uuid.UUID(subject_id), "user_id": user_id},
            return_document=ReturnDocument.BEFORE
        )
        if not subject:
            return None

        self.db.redis.hdel(f"users.subjects:{str(user_id)}", str(subject_id))
        return SafeSubject.model_validate(subject)

    def rename_subject(self, user_id: uuid.UUID, subject_id: uuid.UUID, new_name: str) -> SafeSubject | None:
        subject = self.db.mongo.subjects.find_one_and_update({
            "id": subject_id,
            "user_id": user_id
        }, {
            "$set": {"name": new_name}
        }, return_document=ReturnDocument.AFTER)
        if not subject:
            return None
        self.db.redis.hset(f"users.subjects:{str(user_id)}", str(subject_id), new_name)
        return SafeSubject.model_validate(subject)