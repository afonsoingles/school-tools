from errors.base import BaseError


class FileSizeLimitExceeded(BaseError):
    status_code = 413
    code = "file_size_exceeded"
    message = "This file exceeds the maximum allowed size of 10MB."

class NoFileProvided(BaseError):
    status_code = 400
    code = "no_file_provided"
    message = "No file was provided."

class InvalidFileType(BaseError):
    status_code = 400
    code = "invalid_file_type"
    message = "Invalid file type. Please upload a JSON file."

class InvalidFileContent(BaseError):
    status_code = 400
    code = "invalid_file_content"
    message = "The content of the file is invalid or malformed."