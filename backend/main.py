from fastapi import FastAPI, Request
from dotenv import load_dotenv

load_dotenv()

import os

import sentry_sdk
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from contextlib import asynccontextmanager
from utils.scheduler import scheduler
from apscheduler.triggers.cron import CronTrigger
from utils.limiter import limiter
from utils.migrations import run_migrations
from utils.dev import is_dev
from utils.vapid import log_vapid_config

from errors.base import BaseError

from jobs.generate_ics import generate_pending_feeds
from jobs.update_stats import update_statistics
from jobs.notifications import probe_notifications, send_pending_pushes
from jobs.deletions import run_deletion_maintenance

from routes.auth import router as auth_router
from routes.admin.stats import router as admin_stats_router
from routes.admin.users import router as admin_users_router
from routes.admin.audit import router as admin_audit_router
from routes.admin.notifications import router as admin_notifications_router
from routes.admin.deletions import router as admin_deletions_router
from routes.admin.test_sheets import router as admin_test_sheets_router
from routes.admin.development import router as admin_dev_router
from routes.subjects import router as subjects_router
from routes.classes import router as classes_router
from routes.evaluations import router as evaluations_router
from routes.calendar import router as calendar_router
from routes.homework import router as homework_router
from routes.holidays import router as holidays_router
from routes.api_keys import router as api_keys_router
from routes.notifications import router as notifications_router
from routes.deletions import router as deletions_router
from routes.test_sheets import router as test_sheets_router

sentry_sdk.init(
    dsn=os.environ.get("BACKEND_SENTRY_DSN", ""),
    send_default_pii=True,
    enable_logs=True,
    traces_sample_rate=1.0,
    profile_session_sample_rate=1.0,
    profile_lifecycle = "trace",
    max_request_body_size="always",
    environment=os.environ.get("ENVIRONMENT", "development")
)

scheduler.add_job(
    generate_pending_feeds,
    trigger=CronTrigger(minute="*/5", second=0, timezone="Europe/London"),
    id="calendar.generate_pending_feeds",
    replace_existing=True,
    misfire_grace_time=60,
)

scheduler.add_job(
    update_statistics,
    trigger=CronTrigger(minute=0, second=0, timezone="Europe/London"),
    id="stats.update",
    replace_existing=True,
    misfire_grace_time=60,
)

scheduler.add_job(
    probe_notifications,
    trigger=CronTrigger(minute="*/15", second=0, timezone="Europe/London"),
    id="notifications.probe",
    replace_existing=True,
    misfire_grace_time=120,
)

scheduler.add_job(
    send_pending_pushes,
    trigger=CronTrigger(minute="*", second="*/15", timezone="Europe/London"),
    id="notifications.push",
    replace_existing=True,
    misfire_grace_time=30,
)

scheduler.add_job(
    run_deletion_maintenance,
    trigger=CronTrigger(hour=0, minute=0, second=0, timezone="Europe/London"),
    id="deletions.maintenance",
    replace_existing=True,
    misfire_grace_time=300,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    log_vapid_config()
    run_migrations()
    scheduler.start()
    yield
    scheduler.shutdown() 

app = FastAPI(lifespan=lifespan)

app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(admin_test_sheets_router)
app.include_router(admin_stats_router)
app.include_router(admin_users_router)
app.include_router(admin_audit_router)
app.include_router(admin_notifications_router)
app.include_router(admin_deletions_router)
app.include_router(subjects_router)
app.include_router(classes_router)
app.include_router(evaluations_router)
app.include_router(calendar_router)
app.include_router(homework_router)
app.include_router(holidays_router)
app.include_router(api_keys_router)
app.include_router(notifications_router)
app.include_router(deletions_router)
app.include_router(test_sheets_router)

if is_dev():
    app.include_router(admin_dev_router)

app.add_middleware(SlowAPIMiddleware)

@app.exception_handler(BaseError)
async def handle_errors(request, err: BaseError) -> JSONResponse:
    return JSONResponse(
        status_code=err.status_code,
        content=err.to_dict(),
    )

@app.exception_handler(Exception)
async def handle_err(request, err: Exception) -> JSONResponse:
    sentry_sdk.capture_exception(err)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "code": "unknown",
            "message": "Something went wrong. This error has been reported.",
        },
    )

@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "code": "rate_limit_exceeded",
            "message": "You have exceeded the rate limit. Please try again later.",
        },
    )


@app.get("/")
async def root() -> RedirectResponse:
    return RedirectResponse(url=os.environ.get("BASE_URL", "http://localhost:3000/"), status_code=308)
