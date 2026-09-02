from errors.base import BaseError


class InvalidSubjectName(BaseError):
    status_code = 400
    code = "invalid_subject_name"
    message = "The subject name must be between 3 and 50 characters long."

class SubjectNotFound(BaseError):
    status_code = 404
    code = "subject_not_found"
    message = "The requested subject was not found."

class SubjectUsedByClasses(BaseError):
    status_code = 400
    code = "subject_used_by_classes"
    message = "The subject is being used by classes and cannot be deleted."

class InvalidSubjectIcon(BaseError):
    status_code = 400
    code = "invalid_subject_icon"
    message = "The subject icon is invalid."

class SubjectEditMissingFields(BaseError):
    status_code = 400
    code = "subject_edit_missing_fields"
    message = "You need to set either new_name, new_icon or both to edit the subject."