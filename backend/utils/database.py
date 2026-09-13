from pymongo import MongoClient
from redis import Redis
from redis.retry import Retry
from redis.exceptions import ConnectionError, TimeoutError
from redis.backoff import ExponentialBackoff
import os 


class Database:
    _mongo_client = None
    _redis_client = None

    def __init__(self) -> None:
        if os.environ.get("MONGO_FORCE_DB_NAME"):
            name = os.environ.get("MONGO_FORCE_DB_NAME", "school_tools_default")
        else:
            name = "school_tools_" + os.environ.get("ENVIRONMENT", "development")
        
        if not Database._mongo_client:
            Database._mongo_client = MongoClient(
                os.environ.get("MONGO_URL"),
                uuidRepresentation="standard",
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000,
                socketTimeoutMS=15000,
            )
        
        if not Database._redis_client:
            Database._redis_client = Redis.from_url(
                os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=10,
                socket_keepalive=True,
                health_check_interval=30,
                retry_on_timeout=True,
                retry_on_error=[ConnectionError, TimeoutError],
                retry=Retry(
                    ExponentialBackoff(base=0.5, cap=2),
                    retries=2,
                    supported_errors=(ConnectionError, TimeoutError),
                )
            )

        self.redis = Database._redis_client
        self.mongo = Database._mongo_client[name]