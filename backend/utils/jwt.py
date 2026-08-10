
import os
import jwt
from errors.user import InvalidOrExpiredTokenError


class JWT:
    def __init__(self) -> None:
        self.secret = os.environ.get("JWT_SECRET")

    def encode(self, payload):

        token = jwt.encode(
            payload,
            self.secret,
            algorithm="HS256"
        )

        return token

    def decode(self, token):
        try:
            payload = jwt.decode(
                token,
                self.secret,
                algorithms=["HS256"]
            )
        except jwt.ExpiredSignatureError:
            raise InvalidOrExpiredTokenError
        except jwt.InvalidTokenError:
            raise InvalidOrExpiredTokenError

        return payload