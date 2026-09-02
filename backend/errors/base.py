

class BaseError(Exception):

    status_code: int = 500
    code: str = "unknown"
    message: str = "An unexpected error occurred"

    def __init__(self, message: str | None = None) -> None:
        self.message = message if message is not None else self.__class__.message
        super().__init__(self.message)

    def to_dict(self) -> dict:
        return {
            "success": False,
            "code": self.code,
            "message": self.message,
        }

class NotFound(BaseError):
    status_code = 404
    code = "not_found"
    message = "The requested resource was not found"