from fastapi import APIRouter, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from decorators.valid_json import valid_json
from tools.notifications import NotificationTools
from tools.audit import audit_request
from tools.users import UserTools
from models.notification import NotificationType
import uuid


router = APIRouter()
notification_tools = NotificationTools()
user_tools = UserTools()


@router.post("/v1/admin/notifications")
@require_auth(require_admin=True)
@valid_json(["title", "body"])
async def send_notification(request: Request) -> JSONResponse:
    data = request.state.json
    title = data["title"]
    body = data["body"]
    deep_link = data.get("deep_link")
    target = data.get("user_id") or "all"

    if target == "all":
        users, _ = user_tools.get_users(limit=100000)
        recipients = [user.id for user in users if user.active]
    else:
        try:
            recipient_id = uuid.UUID(str(target))
        except Exception:
            return JSONResponse({"success": False, "code": "invalid_user", "message": "Invalid user id."}, status_code=400)
        user_tools.get_user_by_id(recipient_id)
        recipients = [recipient_id]

    delivered = 0
    skipped = 0
    for user_id in recipients:
        created = notification_tools.create(user_id, NotificationType.ADMIN, title, body, deep_link)
        if created is not None:
            delivered += 1
        else:
            skipped += 1

    audit_request(
        request,
        "create",
        "notification",
        resource_id=None,
        summary=f"Sent notification to {'all users' if target == 'all' else target} ({delivered} recipients, {skipped} skipped)",
    )

    return JSONResponse(jsonable_encoder({"success": True, "delivered": delivered, "skipped": skipped}))