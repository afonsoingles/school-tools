from models.api_key import ApiKey, SafeApiKey
from utils.database import Database
from errors.api_keys import InvalidApiKeyName, ApiKeyNotFound
from pymongo import ReturnDocument
import uuid
import secrets
import hashlib
import datetime


KEY_PREFIX = "sk_"


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


class ApiKeyTools:
    def __init__(self) -> None:
        self.db = Database()

    def _redis_key(self, key_hash: str) -> str:
        return f"users.api_keys.hash:{key_hash}"

    def _last_used_key(self, key_id) -> str:
        return f"users.api_keys.last_used:{key_id}"

    def create_key(self, user_id: uuid.UUID, name: str) -> tuple[SafeApiKey, str]:
        name = str(name).strip()
        if len(name) < 2 or len(name) > 50:
            raise InvalidApiKeyName

        raw = KEY_PREFIX + secrets.token_urlsafe(32)
        key_hash = hash_key(raw)

        api_key = ApiKey(
            user_id=user_id,
            name=name,
            key_hash=key_hash,
            prefix=raw[:10],
        )

        api_key_dict = api_key.model_dump()
        api_key_dict["_id"] = api_key.id

        self.db.mongo.api_keys.insert_one(api_key_dict)

        return SafeApiKey.model_validate(api_key_dict), raw

    def get_user_keys(self, user_id: uuid.UUID) -> list[SafeApiKey]:
        keys = self.db.mongo.api_keys.find({"user_id": user_id}).sort("created_at", -1)
        return [SafeApiKey.model_validate(key) for key in keys]

    def revoke_key(self, user_id: uuid.UUID, key_id: uuid.UUID) -> SafeApiKey:
        key = self.db.mongo.api_keys.find_one_and_update(
            {"id": key_id, "user_id": user_id},
            {"$set": {"revoked": True}},
            return_document=ReturnDocument.AFTER,
        )
        if not key:
            raise ApiKeyNotFound

        self.db.redis.delete(self._redis_key(key["key_hash"]))
        return SafeApiKey.model_validate(key)

    def get_key_by_token(self, token: str) -> ApiKey | None:
        key_hash = hash_key(token)
        redis_key = self._redis_key(key_hash)

        cached = self.db.redis.get(redis_key)
        if cached:
            key = ApiKey.model_validate_json(cached)
        else:
            raw = self.db.mongo.api_keys.find_one({"key_hash": key_hash})
            if not raw:
                return None
            key = ApiKey.model_validate(raw)
            self.db.redis.set(redis_key, key.model_dump_json(), ex=10800)

        if key.revoked:
            return None

        if not self.db.redis.get(self._last_used_key(key.id)):
            self.db.redis.set(self._last_used_key(key.id), "1", ex=3600)
            self.db.mongo.api_keys.update_one(
                {"id": key.id},
                {"$set": {"last_used_at": datetime.datetime.now(datetime.timezone.utc)}},
            )

        return key