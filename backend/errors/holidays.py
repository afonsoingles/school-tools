from errors.base import BaseError


class InvalidHolidaySettings(BaseError):
    status_code = 400
    code = "invalid_holiday_settings"
    message = "The request to change the holiday settings is invalid. Please check the parameters and try again."


class InvalidHolidayDate(BaseError):
    status_code = 400
    code = "invalid_holiday_date"
    message = "The provided date is invalid. Please provide a date in the DD/MM/YYYY format."


class HolidayCountryUnknown(BaseError):
    status_code = 400
    code = "holiday_country_unknown"
    message = "We could not determine a country from your timezone, so automatic holiday cancellation is unavailable."