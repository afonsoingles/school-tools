import datetime
from icalendar import Calendar, Event

ICAL_PRODID_CLASSES = "-//School Tools//Classes//EN"
ICAL_PRODID_EVENTS = "-//School Tools//Evaluations//EN"

class CalendarGenerator:
    def __init__(self, prodid: str, name: str):
        cal = Calendar()
        self.cal = cal
        cal.add("prodid", prodid)
        cal.add("version", "2.0")
        cal.add("calscale", "GREGORIAN")
        cal.add("method", "PUBLISH")
        cal.add("X-WR-CALNAME", name)

    def build_event(self, uid: str, summary: str, start: datetime.datetime, end: datetime.datetime, rrule: str = "", exdates: list[datetime.datetime] = [], category: str = ""):
        event = Event()
        event.add("uid", f"{uid}@school-tools.afonsoingles.dev")
        event.add("dtstamp", datetime.datetime.now(datetime.timezone.utc))
        event.add("summary", summary)
        event.add("dtstart", start)
        event.add("dtend", end)

        if rrule:
            event.add("rrule", rrule)
        if exdates:
            event.add("exdate", exdates)
        if category:
            event.add("categories", category)

        self.cal.add_component(event)