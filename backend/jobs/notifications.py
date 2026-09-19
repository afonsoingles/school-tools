from tools.notifications import NotificationTools
from tools.users import UserTools
from tools.evaluations import EvaluationTools
from tools.homework import HomeworkTools
from tools.subjects import SubjectTools
from tools.classes import ClassTools
from tools.holidays import HolidayTools
from tools.test_sheets import TestSheetTools
from models.notification import NotificationType
from models.homework import HomeworkStatus
from utils.locale import locale_for_timezone
from utils.translations import (
    evaluation_reminder,
    homework_reminder,
    homework_overdue,
    holiday as holiday_text,
    cancelled_class,
    test_sheet_stock_low,
    test_sheet_reconcile,
)
from utils.database import Database
from zoneinfo import ZoneInfo
import datetime
import sentry_sdk

db = Database()
notification_tools = NotificationTools()
user_tools = UserTools()
evaluation_tools = EvaluationTools()
homework_tools = HomeworkTools()
subject_tools = SubjectTools()
class_tools = ClassTools()
holiday_tools = HolidayTools()
test_sheet_tools = TestSheetTools()

HOUR = datetime.timedelta(hours=1)


def _claim(key: str, ttl_seconds: int = 172800) -> bool:
    """Atomically claim a dedup slot; returns True only the first time."""
    return bool(db.redis.set(key, "1", ex=ttl_seconds, nx=True))


def _as_utc(value: datetime.datetime) -> datetime.datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=datetime.timezone.utc)
    return value.astimezone(datetime.timezone.utc)


def probe_notifications() -> None:
    print("[NOTIFICATIONS] Probing for due notifications...")
    users, _ = user_tools.get_users(limit=100000)
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    created = 0

    for user in users:
        if not user.active:
            continue
        if not notification_tools.get_settings_enabled(user.id):
            continue

        try:
            locale = locale_for_timezone(str(user.timezone))
            tz = ZoneInfo(str(user.timezone))
            now_local = now_utc.astimezone(tz)

            subjects = {str(s.id): s.name for s in subject_tools.get_user_subjects(user.id)}
            classes = {str(c.id): c for c in class_tools.get_user_class_schedule(user.id)}

            created += _probe_evaluations(user, locale, tz, now_local, classes, subjects)
            created += _probe_homework(user, locale, now_utc, subjects)
            created += _probe_holidays(user, locale, tz)
            created += _probe_cancellations(user, locale, tz, classes, subjects)
            created += _probe_test_sheets(user, locale, tz)
        except Exception as err:
            sentry_sdk.capture_exception(err)
            continue

    print(f"[NOTIFICATIONS] Probe finished. Created {created} notification(s).")
    return


def _probe_evaluations(user, locale, tz, now_local, classes, subjects) -> int:
    created = 0
    now_naive = now_local.replace(tzinfo=None)
    for evaluation in evaluation_tools.get_user_evaluations(user.id):
        eval_date = evaluation.date
        if eval_date.tzinfo is not None:
            eval_date = eval_date.astimezone(tz).replace(tzinfo=None)

        window_start = eval_date - datetime.timedelta(hours=24)
        if not (window_start <= now_naive < eval_date):
            continue

        if not _claim(f"notif.sent.eval:{user.id}:{evaluation.id}"):
            continue

        class_event = classes.get(str(evaluation.class_id))
        subject = subjects.get(str(class_event.subject_id), "") if class_event else ""
        title, body = evaluation_reminder(locale, evaluation.type.value, subject, eval_date.date())
        notification_tools.create(user.id, NotificationType.EVALUATION, title, body, "/evaluations")
        created += 1
    return created


def _probe_homework(user, locale, now_utc, subjects) -> int:
    created = 0
    for homework in homework_tools.get_user_homeworks(user.id):
        if homework.status == HomeworkStatus.FINISHED:
            continue

        due = _as_utc(homework.due_date)
        remaining = due - now_utc
        subject = subjects.get(str(homework.subject_id), "")

        if remaining < datetime.timedelta(0):
            if _claim(f"notif.sent.hw.overdue:{user.id}:{homework.id}"):
                title, body = homework_overdue(locale, subject, homework.title)
                notification_tools.create(user.id, NotificationType.HOMEWORK, title, body, "/homework")
                created += 1
            continue

        window = None
        if remaining <= 1 * HOUR:
            window = "1h"
        elif remaining <= 12 * HOUR:
            window = "12h"
        elif remaining <= 24 * HOUR:
            window = "24h"

        if window is None:
            continue

        if _claim(f"notif.sent.hw.{window}:{user.id}:{homework.id}"):
            title, body = homework_reminder(locale, window, subject, homework.title)
            notification_tools.create(user.id, NotificationType.HOMEWORK, title, body, "/homework")
            created += 1
    return created


def _probe_holidays(user, locale, tz) -> int:
    today = datetime.datetime.now(tz).date()
    holidays = holiday_tools.get_auto_holiday_dates(user.id, today, today)
    if not holidays:
        return 0

    if not _claim(f"notif.sent.holiday:{user.id}:{today.isoformat()}", ttl_seconds=259200):
        return 0

    title, body = holiday_text(locale)
    notification_tools.create(user.id, NotificationType.HOLIDAY, title, body, "/calendar")
    return 1


def _probe_cancellations(user, locale, tz, classes, subjects) -> int:
    created = 0
    today = datetime.datetime.now(tz).date()

    for class_event in classes.values():
        for cancellation in class_event.cancellations:
            if cancellation.date != today:
                continue
            if not _claim(f"notif.sent.cancel:{user.id}:{cancellation.id}", ttl_seconds=259200):
                continue

            subject = subjects.get(str(class_event.subject_id), "")
            title, body = cancelled_class(locale, subject)
            notification_tools.create(user.id, NotificationType.CANCELLED_CLASS, title, body, "/calendar")
            created += 1

    for day_cancellation in class_tools.get_user_day_cancellations(user.id):
        if day_cancellation.date != today:
            continue
        if not _claim(f"notif.sent.cancel.day:{user.id}:{day_cancellation.id}", ttl_seconds=259200):
            continue

        title, body = cancelled_class(locale, "")
        notification_tools.create(user.id, NotificationType.CANCELLED_CLASS, title, body, "/calendar")
        created += 1

    return created


def _probe_test_sheets(user, locale, tz) -> int:
    stock = test_sheet_tools.get_stock(user.id)
    if not stock.enabled:
        return 0

    created = 0
    today = datetime.datetime.now(tz).date().isoformat()

    pending = test_sheet_tools.get_pending_evaluations(user.id)
    if pending and _claim(f"notif.sent.sheets.reconcile:{user.id}:{today}", ttl_seconds=259200):
        title, body = test_sheet_reconcile(locale, len(pending))
        notification_tools.create(user.id, NotificationType.TEST_SHEET_RECONCILE, title, body, "/evaluations")
        created += 1

    if test_sheet_tools.is_low(stock) and _claim(f"notif.sent.sheets.low:{user.id}:{today}", ttl_seconds=259200):
        title, body = test_sheet_stock_low(locale, stock.lined + stock.graph, stock.lined, stock.graph)
        notification_tools.create(user.id, NotificationType.TEST_SHEET_STOCK, title, body, "/settings/test-sheets")
        created += 1

    return created


def send_pending_pushes() -> None:
    notification_tools.process_pending_pushes()
    return