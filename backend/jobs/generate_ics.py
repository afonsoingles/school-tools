import uuid
import datetime
from zoneinfo import ZoneInfo
from utils.ics import CalendarGenerator, ICAL_PRODID_CLASSES, ICAL_PRODID_EVENTS
from tools.subjects import SubjectTools
from tools.classes import ClassTools, _active_schedule
from tools.calendar import CalendarTools
from tools.evaluations import EvaluationTools
from tools.holidays import HolidayTools
from tools.users import UserTools
from models.calendar import CalendarFeedType
import sentry_sdk

def generate_and_publish_ics_feed(user: uuid.UUID):

    subject_tools = SubjectTools()
    class_tools = ClassTools()
    evaluation_tools = EvaluationTools()
    calendar_tools = CalendarTools()
    user_tools = UserTools()
    holiday_tools = HolidayTools()

    user_tz_raw = user_tools.get_user_by_id(str(user)).timezone
    calendar_tokens = calendar_tools.get_calendar_tokens(user)
    ics_enabled = calendar_tokens.is_enabled if calendar_tokens is not None else False

    if not ics_enabled:
        return
    
    classes_calendar = CalendarGenerator(ICAL_PRODID_CLASSES, "School Tools - Classes", tz=user_tz_raw)
    evaluations_calendar = CalendarGenerator(ICAL_PRODID_EVENTS, "School Tools - Evaluations", tz=user_tz_raw)

   
    # Ensure we have a tzinfo-compatible object (ZoneInfo or similar)
    if isinstance(user_tz_raw, str):
        user_tz = ZoneInfo(user_tz_raw)
    else:
        user_tz = user_tz_raw

    # Evaluations
    eval_by_class: dict[uuid.UUID, list[datetime.datetime]] = {}
    evaluations = evaluation_tools.get_user_evaluations(user)
    classes = class_tools.get_user_class_schedule(user)
    day_cancellations = class_tools.get_user_day_cancellations(user)
    day_cancelled_dates = {dc.date for dc in day_cancellations}
    subject_map = {subject.id: subject.name for subject in subject_tools.get_user_subjects(user)}
    evaluations_map = {
        "exam": "Exam",
        "quiz": "Quiz",
        "other": "Assignment"
    }
    for evaluation in evaluations:
        evaluation_class = next((cls for cls in classes if cls.id == evaluation.class_id), None)
        if evaluation_class is None:
            continue
        evaluation_date = evaluation.date
        schedule = _active_schedule(evaluation_class, evaluation_date.date())
        if schedule is None:
            continue
        start = datetime.datetime.combine(evaluation_date, schedule.start_time, tzinfo=user_tz)
        end = datetime.datetime.combine(evaluation_date, schedule.end_time, tzinfo=user_tz)
        evaluations_calendar.build_event(
            uid=str(evaluation.id),
            summary=f"{evaluations_map[evaluation.type]} - {subject_map[evaluation_class.subject_id]}",
            start=start,
            end=end,
        )
        eval_by_class.setdefault(evaluation.class_id, []).append(evaluation_date)

    evaluation_ics = evaluations_calendar.cal.to_ical().decode("utf-8")

    calendar_tools.save_calendar_feed(user, CalendarFeedType.EVALUATIONS, evaluation_ics)

    # Classes
    
    START_GENERATING_FROM = datetime.datetime(2026, 9, 1, tzinfo=user_tz)
    END_GENERATING_AT = datetime.datetime(2027, 6, 30, tzinfo=user_tz)
    #TODO: ^ the above are temp values. It shall use user settings later.

    def _first_occurrence(start_date: datetime.date, weekday_index: int, time_value: datetime.time) -> datetime.datetime:
        days_ahead = (weekday_index - start_date.weekday()) % 7
        first_date = start_date + datetime.timedelta(days=days_ahead)
        return datetime.datetime.combine(first_date, time_value, tzinfo=user_tz)

    # Auto-cancel public holidays
    day_cancelled_dates.update(
        datetime.date.fromisoformat(d) for d in holiday_tools.get_auto_holiday_dates(
            user,
            START_GENERATING_FROM.date(),
            END_GENERATING_AT.date(),
        )
    )

    for cls in classes:
        for schedule in cls.schedules:
            schedule_weekday_index = schedule.scheduled_weekday.value - 1

            # Effective window for this schedule entry: past dates are preserved by
            # each schedule's own valid_from/valid_until, so reschedules never rewrite history.
            eff_start = max(START_GENERATING_FROM.date(), schedule.valid_from)
            eff_end = schedule.valid_until if schedule.valid_until is not None else END_GENERATING_AT.date()
            if eff_end < eff_start:
                continue

            first_start = _first_occurrence(eff_start, schedule_weekday_index, schedule.start_time)
            first_end = datetime.datetime.combine(first_start.date(), schedule.end_time, tzinfo=user_tz)

            evaluation_dates = [
                d.date() for d in eval_by_class.get(cls.id, [])
                if eff_start <= d.date() <= eff_end and d.date().weekday() == schedule_weekday_index
            ]
            cancellation_dates = [
                c.date for c in cls.cancellations
                if eff_start <= c.date <= eff_end and c.date.weekday() == schedule_weekday_index
            ]
            day_off_dates = [
                d for d in day_cancelled_dates
                if eff_start <= d <= eff_end and d.weekday() == schedule_weekday_index
            ]

            exdates = [
                datetime.datetime.combine(d, schedule.start_time, tzinfo=user_tz)
                for d in sorted(set(evaluation_dates + cancellation_dates + day_off_dates))
            ]
            until = (eff_end + datetime.timedelta(days=1)).strftime("%Y%m%dT000000")
            classes_calendar.build_event(
                uid=f"{cls.id}:{schedule.id}",
                summary=subject_map[cls.subject_id],
                start=first_start,
                end=first_end,
                exdates=exdates,
                rrule=f"FREQ=WEEKLY;UNTIL={until}",
            )

    classes_ics = classes_calendar.cal.to_ical().decode("utf-8")
    calendar_tools.save_calendar_feed(user, CalendarFeedType.CLASSES, classes_ics)

    return

def generate_pending_feeds() -> None:
    print("[FEED GENERATOR] Generating pending feeds...")
    calendar_tools = CalendarTools()
    dirty_users = calendar_tools.get_dirty_users()
    for user in dirty_users:
        try:
            print(f"[FEED GENERATOR] Generating feed for user {user}")
            count_before = calendar_tools.get_user_dirty_count(user)
            generate_and_publish_ics_feed(user)
            count_after = calendar_tools.get_user_dirty_count(user)

            if count_after == count_before:
                calendar_tools.clear_user_dirty(user)
        except Exception as e:
            sentry_sdk.capture_exception(e)
            calendar_tools.clear_user_dirty(user) # We do not need broken users to be stuck as dirty forever. Doing so does not benefit the user, and will clog sentry.
            sentry_sdk.metrics.count("calendar.feeds.failed", 1, attributes={"user_id": str(user)})
            continue
            
        sentry_sdk.metrics.count("calendar.feeds.generated", 1, attributes={"user_id": str(user)})