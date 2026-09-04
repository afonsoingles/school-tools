from errors.base import BaseError

class HomeworkNotFound(BaseError):
    status_code = 404
    code = "homework_not_found"
    message = "The requested homework was not found."

class InvalidHomeworkStatus(BaseError):
    status_code = 400
    code = "invalid_homework_status"
    message = "The provided homework status is invalid."

class InvalidHomeworkTitle(BaseError):
    status_code = 400
    code = "invalid_homework_title"
    message = "The provided homework title is invalid. It must be a string with a minimum length of 1 and a maximum length of 70 characters."

class InvalidHomeworkDescription(BaseError):
    status_code = 400
    code = "invalid_homework_description"
    message = "The provided homework description is invalid. It must be a string with a minimum length of 1 and a maximum length of 1500 characters."

class HomeworkDateInThePast(BaseError):
    status_code = 400
    code = "homework_date_in_the_past"
    message = "The provided homework date is in the past. Please provide a future date."