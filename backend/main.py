from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

import os
import sentry_sdk
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from errors.base import BaseError

from routes.auth import router as auth_router

sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN", ""),
    send_default_pii=True,
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


@app.exception_handler(BaseError)
async def handle_errors(request, err: BaseError) -> JSONResponse:
    #TODO: Log the error to Sentry
    return JSONResponse(
        status_code=err.status_code,
        content=err.to_dict(),
    )


@app.get("/")
async def root() -> RedirectResponse:
    return RedirectResponse(url=os.environ.get("BEAVER_BASE_URL", "http://localhost:3000/"), status_code=308)
