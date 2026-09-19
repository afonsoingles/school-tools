from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from tools.audit import AuditTools
import datetime


router = APIRouter()
audit_tools = AuditTools()

VALID_RESOURCES = {"subject", "class", "evaluation", "homework", "holiday", "settings", "api_key", "notification", "deletion", "folha", "auth", "user", "push"}


@router.get("/v1/admin/audit")
@require_auth(require_admin=True)
async def get_audit_logs(request: Request) -> JSONResponse:
    limit = max(1, min(int(request.query_params.get("limit") or 50), 200))
    offset = max(0, int(request.query_params.get("offset") or 0))
    user_id = request.query_params.get("user_id", None)
    resource = request.query_params.get("resource", None)
    if resource and resource not in VALID_RESOURCES:
        resource = None
    action = request.query_params.get("action", None)
    via = request.query_params.get("via", None)
    if via not in ("web", "api"):
        via = None

    created_from = None
    created_to = None
    from_raw = request.query_params.get("from", None)
    to_raw = request.query_params.get("to", None)
    try:
        if from_raw:
            created_from = datetime.datetime.fromisoformat(from_raw)
            if created_from.tzinfo is None:
                created_from = created_from.replace(tzinfo=datetime.timezone.utc)
            else:
                created_from = created_from.astimezone(datetime.timezone.utc)
        if to_raw:
            created_to = datetime.datetime.fromisoformat(to_raw)
            if created_to.tzinfo is None:
                created_to = created_to.replace(tzinfo=datetime.timezone.utc)
            else:
                created_to = created_to.astimezone(datetime.timezone.utc)
    except:
        pass

    logs, total = audit_tools.get_audit_logs(
        limit=limit, offset=offset, user_id=user_id, resource=resource,
        action=action, via=via, created_from=created_from, created_to=created_to,
    )

    return JSONResponse({
        "success": True,
        "logs": [log.model_dump(mode="json") for log in logs],
        "total": total,
    })