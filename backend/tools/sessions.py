from utils.database import Database
import uuid
import datetime
from utils.jwt import JWT
import uuid


class SessionTools:
    def __init__(self) -> None:
        self.db = Database()
        self.jwt = JWT()
    
    def create_session(self, id) -> str:
        now = datetime.datetime.now(datetime.timezone.utc).timestamp()
        payload = {
            "iss": "school-tools.backend.auth",
            "sub": str(id),
            "exp": now + 604800, # 7 days
            "iat": now,
            "jti": str(uuid.uuid4())
        }

        token = self.jwt.encode(payload)

        self.db.redis.hset(f"users.sessions.map:{id}", token, "valid")
        self.db.redis.expire(f"users.sessions.map:{id}", 604800)
        self.db.redis.set(f"users.sessions:{token}", "valid", ex=604800)

        return token
    
    def is_valid_session(self, token) -> bool:

        return self.db.redis.get(f"users.sessions:{token}") == "valid"
    
    def revoke_session(self, token) -> None:
        self.db.redis.delete(f"users.sessions:{token}")
        return

    def revoke_user_sessions(self, id, keep_token=None):
        user_id = str(id)
        keys = self.db.redis.hkeys(f"users.sessions.map:{user_id}")
        if keep_token:
            keys = [k for k in keys if k != keep_token]
        if keys:
            self.db.redis.delete(*[f"users.sessions:{key}" for key in keys])
        if keep_token:
            self.db.redis.hset(f"users.sessions.map:{user_id}", keep_token, "valid")
            self.db.redis.expire(f"users.sessions.map:{user_id}", 604800)
        else:
            self.db.redis.delete(f"users.sessions.map:{user_id}")
