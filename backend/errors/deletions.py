from errors.base import BaseError


class DeletionRequestNotFound(BaseError):
    status_code = 404
    code = "deletion_request_not_found"
    message = "The deletion request could not be found."


class DeletionAlreadyPending(BaseError):
    status_code = 409
    code = "deletion_already_pending"
    message = "There is already a deletion request in progress for this account."


class DeletionNotReversible(BaseError):
    status_code = 400
    code = "deletion_not_reversible"
    message = "This deletion request can no longer be reversed."


class DeletionNotApprovable(BaseError):
    status_code = 400
    code = "deletion_not_approvable"
    message = "This deletion request cannot be approved in its current state."


class InvalidDeletionReason(BaseError):
    status_code = 400
    code = "invalid_deletion_reason"
    message = "Please provide a reason between 3 and 500 characters."
