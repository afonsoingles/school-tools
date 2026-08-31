from errors.base import BaseError


class ClassOverlap(BaseError):
    status_code = 413
    code = "class_overlap"
    message = "Classes cannot overlap. There is already a class scheduled at this time."

class SubjectNotFoundForClass(BaseError):
    status_code = 404
    code = "subject_not_found" # it shares the same code as subject not found error, just a different message
    message = "The subject ID you provided is invalid or does not belong to you."

class InvalidWeekday(BaseError):
    status_code = 400
    code = "invalid_weekday"
    message = "The weekday you provided is invalid. It must be a number between 1 and 7 where 1 is Monday and 7 is Sunday."

class InvalidTimeFormat(BaseError):
    status_code = 400
    code = "invalid_time_format"
    message = "The time format you provided is invalid. It must be in the format HH:MM where HH is the hour and MM is the minute."

class ClassNotFound(BaseError):
    status_code = 404
    code = "class_not_found"
    message = "This class does not exist or does not belong to you."

class InvalidCancellationReason(BaseError):
    status_code = 400
    code = "invalid_cancellation_reason"
    message = "The cancellation reason you provided is invalid. It must be one of the following: break, public_holiday, other."

class InvalidDate(BaseError):
    status_code = 400
    code = "invalid_date"
    message = "The date you provided is invalid. It must be in the format DD/MM/YYYY."

class ClassAlreadyCanceled(BaseError):
    status_code = 400
    code = "class_already_canceled"
    message = "This class has already been canceled for the specified date."

class CancellationNotFound(BaseError):
    status_code = 400
    code = "cancellation_not_found"
    message = "This cancellation does not exist or does not belong to you."

class ClassCancelled(BaseError):
    status_code = 400
    code = "class_cancelled"
    message = "This class has been canceled for the specified date."

class ClassUsedByEvaluation(BaseError):
    status_code = 400
    code = "class_used_by_evaluation"
    message = "This class is being used by an evaluation and cannot be deleted or cancelled."