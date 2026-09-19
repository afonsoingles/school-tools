from fastapi import APIRouter, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from decorators.valid_json import valid_json
from tools.notifications import NotificationTools, push_subscription_dict
from errors.notifications import *
import uuid


router = APIRouter()
notification_tools = NotificationTools()


@router.get("/v1/notifications")
@require_auth(allow_unverified_email=True)
async def get_notifications(request: Request) -> JSONResponse:
    limit = min(int(request.query_params.get("limit", 50)), 100)
    notifications = notification_tools.get_user_notifications(request.state.user.id, limit)
    return JSONResponse(jsonable_encoder({"success": True, "notifications": [n.model_dump() for n in notifications]}))


@router.get("/v1/notifications/unread-count")
@require_auth(allow_unverified_email=True)
async def get_unread_count(request: Request) -> JSONResponse:
    count = notification_tools.get_unread_count(request.state.user.id)
    return JSONResponse({"success": True, "count": count})


@router.patch("/v1/notifications/{notification_id}/read")
@require_auth(allow_unverified_email=True)
async def mark_notification_read(request: Request, notification_id: str) -> JSONResponse:
    try:
        notification_uuid = uuid.UUID(notification_id)
    except Exception:
        raise NotificationNotFound

    notification = notification_tools.mark_read(request.state.user.id, notification_uuid)
    return JSONResponse(jsonable_encoder({"success": True, "notification": notification.model_dump()}))


@router.post("/v1/notifications/read-all")
@require_auth(allow_unverified_email=True)
async def mark_all_notifications_read(request: Request) -> JSONResponse:
    notification_tools.mark_all_read(request.state.user.id)
    return JSONResponse({"success": True})


@router.delete("/v1/notifications/{notification_id}")
@require_auth(allow_unverified_email=True)
async def delete_notification(request: Request, notification_id: str) -> JSONResponse:
    try:
        notification_uuid = uuid.UUID(notification_id)
    except Exception:
        raise NotificationNotFound

    notification_tools.delete_notification(request.state.user.id, notification_uuid)
    return JSONResponse({"success": True})


@router.get("/v1/notifications/settings")
@require_auth(allow_unverified_email=True)
async def get_notification_settings(request: Request) -> JSONResponse:
    enabled = notification_tools.get_settings_enabled(request.state.user.id)
    return JSONResponse({"success": True, "enabled": enabled})


@router.patch("/v1/notifications/settings")
@require_auth(allow_unverified_email=True)
@valid_json(["enabled"])
async def update_notification_settings(request: Request) -> JSONResponse:
    enabled = notification_tools.set_settings_enabled(request.state.user.id, bool(request.state.json["enabled"]))
    return JSONResponse({"success": True, "enabled": enabled})


@router.post("/v1/notifications/subscribe")
@require_auth(allow_unverified_email=True)
@valid_json(["endpoint", "keys"])
async def subscribe_push(request: Request) -> JSONResponse:
    data = request.state.json
    keys = data.get("keys") or {}
    p256dh = keys.get("p256dh")
    auth = keys.get("auth")
    if not data.get("endpoint") or not p256dh or not auth:
        raise InvalidPushSubscription

    notification_tools.subscribe(
        request.state.user.id,
        data["endpoint"],
        p256dh,
        auth,
        device_label=data.get("device_label"),
    )
    return JSONResponse({"success": True})


@router.get("/v1/notifications/subscriptions")
@require_auth(allow_unverified_email=True)
async def get_push_subscriptions(request: Request) -> JSONResponse:
    subscriptions = notification_tools.list_subscriptions(request.state.user.id)
    return JSONResponse({
        "success": True,
        "subscriptions": [push_subscription_dict(sub) for sub in subscriptions],
    })


@router.patch("/v1/notifications/subscriptions")
@require_auth(allow_unverified_email=True)
@valid_json(["endpoint", "enabled"])
async def update_push_subscription(request: Request) -> JSONResponse:
    data = request.state.json
    found = notification_tools.set_subscription_enabled(
        request.state.user.id,
        data["endpoint"],
        bool(data["enabled"]),
    )
    return JSONResponse({"success": True, "found": found})


@router.post("/v1/notifications/unsubscribe")
@require_auth(allow_unverified_email=True)
@valid_json(["endpoint"])
async def unsubscribe_push(request: Request) -> JSONResponse:
    notification_tools.unsubscribe(request.state.user.id, request.state.json["endpoint"])
    return JSONResponse({"success": True})


@router.get("/v1/notifications/vapid-key")
async def get_vapid_key() -> JSONResponse:
    import os
    public_key = os.environ.get("VAPID_PUBLIC_KEY")
    if not public_key:
        raise PushNotConfigured
    return JSONResponse({"success": True, "public_key": public_key})