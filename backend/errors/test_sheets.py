from errors.base import BaseError


class TestSheetsDisabled(BaseError):
    status_code = 403
    code = "test_sheets_disabled"
    message = "Test sheets tracking is not enabled for this account."


class InvalidTestSheetAmount(BaseError):
    status_code = 400
    code = "invalid_test_sheet_amount"
    message = "Test sheet amounts must be whole numbers between 0 and 1000."


class TestSheetEvaluationNotFound(BaseError):
    status_code = 404
    code = "test_sheet_evaluation_not_found"
    message = "The evaluation to reconcile could not be found."


class TestSheetAlreadyReconciled(BaseError):
    status_code = 409
    code = "test_sheet_already_reconciled"
    message = "This evaluation has already been reconciled."
