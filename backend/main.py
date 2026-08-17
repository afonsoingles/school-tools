from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

import os
import sentry_sdk
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from errors.base import BaseError

from routes.auth import router as auth_router
from routes.admin import router as admin_router

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

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(admin_router)


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

@app.get("/")
async def root() -> RedirectResponse:
    return RedirectResponse(url=os.environ.get("BASE_URL", "http://localhost:3000/"), status_code=308)

@app.get("/error")
async def error() -> float:
    return 1/0