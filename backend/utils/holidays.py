from utils.tz_countries import TZ_TO_COUNTRY
import datetime
import holidays


def country_for_timezone(timezone: str | None) -> str | None:
    if not timezone:
        return None
    return TZ_TO_COUNTRY.get(timezone)


def public_holiday_dates(country: str, start: datetime.date, end: datetime.date) -> set[datetime.date]:
    if start > end:
        return set()

    years = set(range(start.year, end.year + 1))
    year_holidays = holidays.country_holidays(country, years=years)

    return {d for d in year_holidays if start <= d <= end}