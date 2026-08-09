from pymongo import MongoClient
from redis import Redis
import os 


class Database:
    _mongo_client = None
    _redis_client = None

    def __init__(self) -> None:
        if os.environ.get("MONGO_FORCE_DB_NAME"):
            name = os.environ.get("MONGO_FORCE_DB_NAME", "inventory_default")
        else:
            name = "inventory_" + os.environ.get("ENVIRONMENT", "development")
        
        if not Database._mongo_client:
            Database._mongo_client = MongoClient(
                os.environ.get("MONGO_URL"),
                uuidRepresentation="standard",
            )
        
        if not Database._redis_client:
            Database._redis_client = Redis.from_url(
                os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
                decode_responses=True
            )

        self.redis = Database._redis_client
        self.mongo = Database._mongo_client[name]