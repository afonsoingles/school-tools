

class BaseError(Exception):

    status_code: int = 500
    code: str = "unknown"

    def __init__(self, message: str = "uh oh! something broke :(") -> None:
        self.message = message
        super().__init__(self.message)

    def to_dict(self) -> dict:
        return {
            "success": False,
            "code": self.code,
            "message": self.message,
        }