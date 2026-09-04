import datetime
from zoneinfo import ZoneInfo
from errors.homework import HomeworkDateInThePast

def parse_user_datetime(value: str, tz: str) -> datetime.datetime:
    dt = datetime.datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo(tz))

    dt = dt.astimezone(ZoneInfo(tz))

    if dt < datetime.datetime.now(datetime.timezone.utc):
        raise HomeworkDateInThePast

    return dt