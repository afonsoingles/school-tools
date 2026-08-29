import uuid
import datetime
from utils.ics import CalendarGenerator, ICAL_PRODID_CLASSES, ICAL_PRODID_EVENTS
from tools.subjects import SubjectTools
from tools.classes import ClassTools
from tools.calendar import CalendarTools
from tools.evaluations import EvaluationTools
from tools.calendar import CalendarTools
from models.calendar import CalendarFeedType
from sentry_sdk import metrics

def generate_and_publish_ics_feed(user: uuid.UUID):

    subject_tools = SubjectTools()
    class_tools = ClassTools()
    evaluation_tools = EvaluationTools()
    calendar_tools = CalendarTools()
    
    classes_calendar = CalendarGenerator(ICAL_PRODID_CLASSES, "School Tools - Classes")
    evaluations_calendar = CalendarGenerator(ICAL_PRODID_EVENTS, "School Tools - Evaluations")

    # Evaluations
    eval_by_class: dict[uuid.UUID, list[datetime.datetime]] = {}
    evaluations = evaluation_tools.get_user_evaluations(user)
    classes = class_tools.get_user_class_schedule(user)
    cancellations = class_tools.get_user_canceled_classes(user)
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
        start = datetime.datetime.combine(evaluation_date, evaluation_class.start_time)
        end = datetime.datetime.combine(evaluation_date, evaluation_class.end_time)
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
    
    START_GENERATING_FROM = datetime.datetime(2026, 9, 1)
    END_GENERATING_AT = datetime.datetime(2027, 6, 30)
    #TODO: ^ the above are temp values. It shall use user settings later.

    def _first_occurrence(start_from: datetime.datetime, weekday: int, time_value: datetime.time) -> datetime.datetime:
        days_ahead = (weekday - start_from.weekday()) % 7
        first_date = start_from.date() + datetime.timedelta(days=days_ahead)
        first_occurrence = datetime.datetime.combine(first_date, time_value)
        if first_occurrence < start_from:
            first_occurrence += datetime.timedelta(days=7)
        return first_occurrence

    for cls in classes:
        weekday = cls.weekday.value - 1 

        first_start = _first_occurrence(START_GENERATING_FROM, int(weekday), cls.start_time)
        first_end = datetime.datetime.combine(first_start.date(), cls.end_time)
        exdates = [
            datetime.datetime.combine(d, cls.start_time)
            for d in sorted(
                set(eval_by_class.get(cls.id, []) + [c.date for c in cancellations if c.class_id == cls.id])
            )
        ]
        classes_calendar.build_event(
            uid=str(cls.id),
            summary=subject_map[cls.subject_id],
            start=first_start,
            end=first_end,
            exdates=exdates,
            rrule=f"FREQ=WEEKLY;UNTIL={END_GENERATING_AT.strftime('%Y%m%dT%H%M%S')}",
        )

    classes_ics = classes_calendar.cal.to_ical().decode("utf-8")
    calendar_tools.save_calendar_feed(user, CalendarFeedType.CLASSES, classes_ics)

    return

def generate_pending_feeds() -> None:
    print("[FEED GENERATOR] Generating pending feeds...")
    calendar_tools = CalendarTools()
    dirty_users = calendar_tools.get_dirty_users()
    for user in dirty_users:
        print(f"[FEED GENERATOR] Generating feed for user {user}")
        count_before = calendar_tools.get_user_dirty_count(user)
        generate_and_publish_ics_feed(user)
        count_after = calendar_tools.get_user_dirty_count(user)

        if count_after == count_before:
            calendar_tools.clear_user_dirty(user)
            
        metrics.count("calendar.feeds.generated", 1, attributes={"user_id": str(user)})