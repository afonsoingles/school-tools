from errors.base import BaseError


class EvaluationNotFound(BaseError):
    status_code = 413
    code = "evaluation_not_found"
    message = "This evaluation does not exist or does not belong to you."

class InvalidEvaluationType(BaseError):
    status_code = 400
    code = "invalid_evaluation_type"
    message = "The evaluation type you provided is invalid."