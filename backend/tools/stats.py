from utils.database import Database
import json
from models.stats import *
import datetime

class StatisticTools:
    def __init__(self) -> None:
        self.db = Database()
        pass

    def _count_docs_users(self, collection_name: str, query: dict | None = None) -> int:
        pipeline = []
        if query:
            pipeline.append({"$match": query})
        pipeline.append({"$group": {"_id": "$user_id"}})
        pipeline.append({"$count": "users"})
        result = list(self.db.mongo[collection_name].aggregate(pipeline))
        return result[0]["users"] if result else 0
    
    def get_user_stats(self, force_refresh: bool = False) -> UserStats:
        cached = self.db.redis.get("stats.users")
        if cached and not force_refresh:
            return UserStats.model_validate(json.loads(cached))

        cut_7d = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)
        cut_30d = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)

        try:
            row = self.db.mongo.users.aggregate([
                {"$group": {"_id": None,
                    "total": {"$sum": 1},
                    "verified": {"$sum": {"$cond": [{"$eq": ["$email_verified", True]}, 1, 0]}},
                    "active": {"$sum": {"$cond": [{"$eq": ["$active", True]}, 1, 0]}},
                    "new_7d": {"$sum": {"$cond": [{"$gte": ["$created_at", cut_7d]}, 1, 0]}},
                    "new_30d": {"$sum": {"$cond": [{"$gte": ["$created_at", cut_30d]}, 1, 0]}}}}
            ]).next()
        except StopIteration:
            row = {"total": 0, "verified": 0, "active": 0, "new_7d": 0, "new_30d": 0}


        stats = UserStats(
            total=row["total"],
            verified=row["verified"],
            unverified=row["total"] - row["verified"],
            active=row["active"],
            inactive=row["total"] - row["active"],
            new_7d=row["new_7d"],
            new_30d=row["new_30d"]
        )

        self.db.redis.set("stats.users", stats.model_dump_json(), ex=3600)

        return stats

    def get_adoption_stats(self, force_refresh: bool = False) -> AdoptionStats:
        cached = self.db.redis.get("stats.adoption")

        if cached and not force_refresh:
            return AdoptionStats.model_validate(json.loads(cached))

        stats = AdoptionStats(
            homework=self._count_docs_users("homework"),
            evaluations=self._count_docs_users("evaluations"),
            subjects=self._count_docs_users("subjects"),
            classes=self._count_docs_users("classes"),
            cancellations=self._count_docs_users("class_cancellations"),
            ics=self.db.mongo.calendar_feed_settings.count_documents({"is_enabled": True})
        )


        self.db.redis.set("stats.adoption", stats.model_dump_json(), ex=3600)

        return stats

    def get_functionality_stats(self, force_refresh: bool = False) -> FunctionalityStats:
        cached = self.db.redis.get("stats.functionality")

        if cached and not force_refresh:
            return FunctionalityStats.model_validate(json.loads(cached))

        stats = FunctionalityStats(
            homework=self.db.mongo.homework.count_documents({}),
            evaluations=self.db.mongo.evaluations.count_documents({}),
            subjects=self.db.mongo.subjects.count_documents({}),
            classes=self.db.mongo.classes.count_documents({}),
            cancellations=self.db.mongo.class_cancellations.count_documents({})
        )

        self.db.redis.set("stats.functionality", stats.model_dump_json(), ex=3600)

        return stats