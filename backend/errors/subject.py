from errors.base import BaseError


class InvalidSubjectName(BaseError):
    status_code = 400
    code = "invalid_subject_name"
    message = "The subject name must be between 3 and 50 characters long."

class SubjectNotFound(BaseError):
    status_code = 404
    code = "subject_not_found"
    message = "The requested subject was not found."