from errors.base import BaseError

class AdminInvalidContentType(BaseError):
    status_code = 404
    code = "admin_invalid_content_type"
    message = "silly goose, stop trying to mess around with this..."
