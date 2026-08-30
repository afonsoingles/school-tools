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

from errors.base import BaseError

from jobs.generate_ics import generate_pending_feeds

from routes.auth import router as auth_router
from routes.admin import router as admin_router
from routes.subjects import router as subjects_router
from routes.classes import router as classes_router
from routes.evaluations import router as evaluations_router
from routes.calendar import router as calendar_router

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

@asynccontextmanager
async def lifespan(app: FastAPI):
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
app.include_router(admin_router)
app.include_router(subjects_router)
app.include_router(classes_router)
app.include_router(evaluations_router)
app.include_router(calendar_router)

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
