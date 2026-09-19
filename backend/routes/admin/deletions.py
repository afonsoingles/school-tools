from fastapi import APIRouter, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from decorators.valid_json import valid_json
from tools.deletions import DeletionTools
from tools.audit import AuditTools, audit_request
from utils.scheduler import scheduler
from errors.deletions import DeletionRequestNotFound
import uuid
import datetime
import sentry_sdk


router = APIRouter()
deletion_tools = DeletionTools()


def _run_manual_purge(user_id: str, via: str) -> None:
    purged = 0
    try:
        purged = deletion_tools.process_daily_purges(ignore_grace=True)
    except Exception as err:
        sentry_sdk.capture_exception(err)

    AuditTools().log(
        user_id=uuid.UUID(user_id),
        action="run_purges",
        resource="deletion",
        summary=f"Ran daily purge job manually ({purged} purged)",
        via=via,
    )


def _parse_uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except (ValueError, TypeError, AttributeError):
        raise DeletionRequestNotFound


@router.get("/v1/admin/deletions")
@require_auth(require_admin=True)
async def list_deletions(request: Request) -> JSONResponse:
    limit = max(1, min(int(request.query_params.get("limit") or 50), 200))
    offset = max(0, int(request.query_params.get("offset") or 0))
    status = request.query_params.get("status") or None

    requests, total = deletion_tools.list_requests(status=status, limit=limit, offset=offset)
    return JSONResponse(
        jsonable_encoder(
            {
                "success": True,
                "requests": [r.model_dump() for r in requests],
                "total": total,
            }
        )
    )


@router.get("/v1/admin/deletions/by-user/{user_id}")
@require_auth(require_admin=True)
async def get_user_deletion(request: Request, user_id: str) -> JSONResponse:
    active = deletion_tools.get_active_for_user(_parse_uuid(user_id))
    return JSONResponse(jsonable_encoder({"success": True, "request": active}))


@router.post("/v1/admin/deletions/nominate")
@require_auth(require_admin=True)
@valid_json(["user_id"])
async def nominate_deletion(request: Request) -> JSONResponse:
    reason = request.state.json.get("reason") or ""
    deletion_request = deletion_tools.nominate(_parse_uuid(str(request.state.json["user_id"])), reason, request.state.user)

    audit_request(
        request,
        "nominate_deletion",
        "deletion",
        resource_id=deletion_request.id,
        summary=f"Nominated {deletion_request.email} for deletion",
    )

    return JSONResponse(jsonable_encoder({"success": True, "request": deletion_request}))


@router.post("/v1/admin/deletions/{request_id}/approve")
@require_auth(require_admin=True)
async def approve_deletion(request: Request, request_id: str) -> JSONResponse:
    deletion_request = deletion_tools.approve(_parse_uuid(request_id), request.state.user)

    audit_request(
        request,
        "approve_deletion",
        "deletion",
        resource_id=deletion_request.id,
        summary=f"Approved deletion of {deletion_request.email}",
    )

    return JSONResponse(jsonable_encoder({"success": True, "request": deletion_request}))


@router.post("/v1/admin/deletions/{request_id}/reverse")
@require_auth(require_admin=True)
async def reverse_deletion(request: Request, request_id: str) -> JSONResponse:
    deletion_request = deletion_tools.reverse(_parse_uuid(request_id), request.state.user)

    audit_request(
        request,
        "reverse_deletion",
        "deletion",
        resource_id=deletion_request.id,
        summary=f"Reversed deletion of {deletion_request.email}",
    )

    return JSONResponse(jsonable_encoder({"success": True, "request": deletion_request}))


@router.post("/v1/admin/deletions/run")
@require_auth(require_superadmin=True)
async def run_daily_purge(request: Request) -> JSONResponse:
    run_date = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=1)
    scheduler.add_job(
        _run_manual_purge,
        trigger="date",
        run_date=run_date,
        id=f"deletions.manual.{uuid.uuid4().hex}",
        args=[str(request.state.user.id), getattr(request.state, "via", "web")],
    )
    return JSONResponse({"success": True, "started": True})
