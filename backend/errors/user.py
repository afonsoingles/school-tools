from errors.base import BaseError


class EmailAlreadyRegisteredError(BaseError):
    status_code = 400
    code = "email_already_registered"
    message = "This email is already registered."

class UserNotFoundError(BaseError):
    status_code = 404
    code = "user_not_found"
    message = "This user was not found on the system."

class UserSuspendedError(BaseError):
    status_code = 403
    code = "suspended"
    message = "This user is suspended and cannot access the system."

class UserPasswordIncorrectError(BaseError):
    status_code = 401
    code = "email_password_incorrect"
    message = "The provided email and password do not match."

class InvalidOrExpiredTokenError(BaseError):
    status_code = 401
    code = "invalid_or_expired_token"
    message = "The provided token is invalid or has expired."

class UserNotVerifiedError(BaseError):
    status_code = 403
    code = "user_not_verified"
    message = "Please verify your email address first."

class UserNotAdmin(BaseError):
    status_code = 403
    code = "user_not_admin"
    message = "sudo make me admin — oh wait, that's not how this works."