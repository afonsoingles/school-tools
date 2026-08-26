import datetime
from typing import Annotated
from pydantic import AfterValidator, PlainSerializer

def _truncate_seconds(t: datetime.time) -> datetime.time:
    return t.replace(second=0, microsecond=0)

HHMM = Annotated[
    datetime.time,
    AfterValidator(_truncate_seconds),
    PlainSerializer(lambda t: t.strftime("%H:%M"), return_type=str),
]

def is_valid_hhmm_string(s: str) -> bool:
    try:
        datetime.datetime.strptime(s, "%H:%M")
        return True
    except ValueError:
        return False