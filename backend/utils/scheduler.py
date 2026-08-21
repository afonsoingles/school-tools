from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.mongodb import MongoDBJobStore
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_MISSED, JobEvent
import os
import sentry_sdk

_db_name = os.environ.get("MONGO_FORCE_DB_NAME", None) or "school_tools_" + os.environ.get("ENVIRONMENT", "development")

scheduler = AsyncIOScheduler(
    jobstores={
        "default": MongoDBJobStore(
            database=_db_name,
            collection="scheduler_jobs",
            client=None,
            host=os.environ.get("MONGO_URL"),
        )
    }
)

def _report_job_failure(event: JobEvent) -> None:
    with sentry_sdk.new_scope() as scope:
        scope.set_tag("scheduler.job_id", event.job_id)
        if event.jobstore:
            scope.set_tag("scheduler.jobstore", event.jobstore)

        if getattr(event, "exception", None):
            scope.set_tag("scheduler.scheduled_for", str(getattr(event, "when", None)))
            sentry_sdk.capture_exception(getattr(event, "exception", None))
        else:
            sentry_sdk.capture_message(
                f"Job {event.job_id} missed its scheduled run at {getattr(event, 'when', 'unknown time')}"
            )


scheduler.add_listener(_report_job_failure, EVENT_JOB_ERROR | EVENT_JOB_MISSED)
