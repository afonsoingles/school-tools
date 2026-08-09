from utils.database import Database
import jwt
import uuid
import datetime
import os


class SessionTools:
    def __init__(self) -> None:
        self.db = Database()
        self.jwt_secret = os.environ.get("JWT_SECRET")
    
    def create_session(self, id) -> str:
        now = datetime.datetime.now(datetime.timezone.utc).timestamp()
        payload = {
            "iss": "api.inventory.afonsoingles.dev",
            "sub": str(id),
            "exp": now + 604800, # 7 days
            "iat": now,
            "jti": str(uuid.uuid4())
        }

        token = jwt.encode(
            payload,
            self.jwt_secret,
            algorithm="HS256"
        )

        self.db.redis.set(f"users.sessions.{token}", "valid", ex=604800)

        return token
    
    def is_valid_session(self, token) -> bool:

        return self.db.redis.get(f"users.sessions.{token}") == "valid"
    
    def revoke_session(self, token) -> None:
        self.db.redis.delete(f"users.sessions.{token}")
        return