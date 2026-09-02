from utils.database import Database
from models.user import User, SafeUser
from errors.user import *
from pydantic import SecretStr
from utils.jwt import JWT
from utils.mailer import Mailer
from pydantic_extra_types.timezone_name import TimeZoneName
import uuid
import bcrypt
import datetime
import os

class UserTools:
    def __init__(self) -> None:
        self.db = Database()
        self.jwt = JWT()
        self.mailer = Mailer()
        pass
    
    def _hash_password(self, password) -> str:
        salt = bcrypt.gensalt(rounds=12)
        result = bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

        return result
    
    def verify_password_hash(self, password, hashed) -> bool:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    
    def create_user(self, name, email, password, timezone: TimeZoneName) -> User:
        
        exists_redis = self.db.redis.get(f"users.lookup.email:{email}")
        if exists_redis:
            raise EmailAlreadyRegisteredError
        
        exists_mongo = self.db.mongo.users.find_one({"email": email})
        if exists_mongo:
            raise EmailAlreadyRegisteredError
        
        hashed_password = self._hash_password(password)

        user = User(
            name=name,
            email=email,
            password=SecretStr(hashed_password),
            timezone=timezone
        )

        user_dict = user.model_dump()
        user_dict["_id"] = user.id  # MongoDB requires _id for some reason. It should not be used in the code.

        self.db.mongo.users.insert_one(user_dict)

        self.db.redis.set(f"users.user:{user.id}", user.model_dump_json(), ex=10800)
        self.db.redis.set(f"users.lookup.email:{email}", str(user.id), ex=10800)

        return User.model_validate(user_dict)

    def get_user_by_id(self, id) -> User:

        redis_user = self.db.redis.get(f"users.user:{id}")
        if redis_user:
            return User.model_validate_json(redis_user)
        
        raw = self.db.mongo.users.find_one({"id": uuid.UUID(id)})

        if not raw:
            raise UserNotFoundError
        
        user = User.model_validate(raw)

        self.db.redis.set(f"users.user:{id}", user.model_dump_json(), ex=10800)
        self.db.redis.set(f"users.lookup.email:{user.email}", id, ex=10800)
        return user

    def get_user_by_email(self, email, raise_credentials_error_on_not_found: bool = False) -> User:
        
        redis_id = self.db.redis.get(f"users.lookup.email:{email}")
        if redis_id:
            return self.get_user_by_id(redis_id)
        
        raw = self.db.mongo.users.find_one({"email": email})
        if not raw:
            if raise_credentials_error_on_not_found:
                raise UserPasswordIncorrectError
            raise UserNotFoundError
        
        user = User.model_validate(raw)

        self.db.redis.set(f"users.user:{str(user.id)}", user.model_dump_json(), ex=10800)
        self.db.redis.set(f"users.lookup.email:{email}", str(user.id), ex=10800)

      
        return user

    def get_users(self, limit: int = 100, offset: int = 0) -> list[User]:
        raw = self.db.mongo.users.find().skip(offset).limit(limit)
        users = [User.model_validate(user) for user in raw]
        
        for user in users:
            self.db.redis.set(f"users.user:{str(user.id)}", user.model_dump_json(), ex=10800)
            self.db.redis.set(f"users.lookup.email:{user.email}", str(user.id), ex=10800)

        return users

    def update_user(self, id, **kwargs) -> User:
        user = self.get_user_by_id(id)
        old_email = None

        for key, value in kwargs.items():
            if key == "password":
                value = self._hash_password(value)
                setattr(user, key, SecretStr(value))
                continue
            if key == "email":
                exists_redis = self.db.redis.get(f"users.lookup.email:{value}")
                if exists_redis and exists_redis != str(user.id):
                    raise EmailAlreadyRegisteredError
                
                exists_mongo = self.db.mongo.users.find_one({"email": value})
                if exists_mongo and str(exists_mongo["id"]) != str(user.id):
                    raise EmailAlreadyRegisteredError
                old_email = user.email
                setattr(user, key, value)
            if hasattr(user, key):
                setattr(user, key, value)

        self.db.mongo.users.update_one({"id": id}, {"$set": user.model_dump()})

        self.db.redis.set(f"users.user:{id}", user.model_dump_json(), ex=10800)
        self.db.redis.set(f"users.lookup.email:{user.email}", str(user.id), ex=10800)
        if old_email:
            self.db.redis.delete(f"users.lookup.email:{old_email}")

        return user
    
    def send_verification_link(self, id, name, email) -> None:
        now = datetime.datetime.now(datetime.timezone.utc).timestamp()

        ttl = self.db.redis.ttl(f"users.verification:{id}")
        if self.db.redis.get(f"users.verification:{id}") and ttl > 0 and (86400 - ttl) < 21600:
            raise VerificationRateLimitedError
        
        payload = {
            "iss": "school-tools.backend.verification",
            "sub": str(id),
            "exp": now + 86400, # 1 day
            "iat": now,
            "jti": str(uuid.uuid4())
        }
        token = self.jwt.encode(payload)

        self.db.redis.set(f"users.verification:{id}", str(token), ex=86400)
        link = f"{os.environ.get('BASE_URL', 'http://localhost:3000')}/auth/verify?token={token}"
        self.mailer.send_email(subject="Verify your email", template="verify_email_en",to=email, name=name, link=link)
        return

    def check_and_verify_email(self, token):
        decoded = self.jwt.decode(token)
        if not decoded["iss"] == "school-tools.backend.verification":
            raise InvalidOrExpiredTokenError
        
        user = self.get_user_by_id(decoded["sub"])

        self.update_user(user.id, email_verified=True)
        self.db.redis.delete(f"users.verification:{user.id}")
        return