from errors.base import BaseError


class ApiKeyNotFound(BaseError):
    status_code = 404
    code = "api_key_not_found"
    message = "That API key was not found."

class ApiKeyRevoked(BaseError):
    status_code = 403
    code = "api_key_revoked"
    message = "That API key has been revoked."

class InvalidApiKeyName(BaseError):
    status_code = 400
    code = "invalid_api_key_name"
    message = "API key names must be between 2 and 50 characters."