from models.notification import Notification, NotificationType, SafeNotification, PushSubscription
from errors.notifications import *
from utils.database import Database
from utils.vapid import make_vapid_helper
from concurrent.futures import ThreadPoolExecutor
import uuid
import datetime
import pywebpush


def push_host(endpoint: str) -> str:
    return endpoint.split("/", 3)[2] if endpoint else "unknown"


def push_subscription_dict(subscription: PushSubscription) -> dict:
    created = subscription.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=datetime.timezone.utc)
    return {
        "device_label": subscription.device_label,
        "endpoint": subscription.endpoint,
        "enabled": subscription.enabled,
        "created_at": created.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
    }


class NotificationTools:
    def __init__(self) -> None:
        self.db = Database()

    def get_settings_enabled(self, user_id: uuid.UUID) -> bool:
        raw = self.db.mongo.users.find_one({"id": user_id}, {"settings.notifications": 1})
        if not raw:
            return True
        settings = raw.get("settings", {}).get("notifications", {})
        return bool(settings.get("enabled", False))

    def set_settings_enabled(self, user_id: uuid.UUID, enabled: bool) -> bool:
        self.db.mongo.users.update_one(
            {"id": user_id},
            {"$set": {"settings.notifications": {"enabled": enabled}}},
        )
        self.db.redis.delete(f"users.user:{user_id}")
        return enabled

    def create(self, user_id: uuid.UUID, type: NotificationType, title: str, body: str, deep_link: str | None = None) -> SafeNotification | None:
        if not self.get_settings_enabled(user_id):
            return None

        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            deep_link=deep_link,
        )
        notification_dict = notification.model_dump()
        notification_dict["_id"] = notification.id

        self.db.mongo.notifications.insert_one(notification_dict)
        self.db.redis.hset(
            f"users.notifications:{str(user_id)}",
            str(notification.id),
            notification.model_dump_json(),
        )
        self.db.redis.expire(f"users.notifications:{str(user_id)}", 7200)

        return SafeNotification.model_validate(notification_dict)

    def get_user_notifications(self, user_id: uuid.UUID, limit: int = 50) -> list[SafeNotification]:
        cached = self.db.redis.hgetall(f"users.notifications:{str(user_id)}")
        if cached:
            notifications = [Notification.model_validate_json(v.decode() if isinstance(v, bytes) else v) for v in cached.values()]
            notifications = sorted(notifications, key=lambda n: n.created_at, reverse=True)
            return [SafeNotification.model_validate(n) for n in notifications[:limit]]

        raw = self.db.mongo.notifications.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
        notifications = [Notification.model_validate(n) for n in raw]
        if notifications:
            self.db.redis.hset(
                f"users.notifications:{str(user_id)}",
                mapping={str(n.id): n.model_dump_json() for n in notifications},
            )
            self.db.redis.expire(f"users.notifications:{str(user_id)}", 7200)
        return [SafeNotification.model_validate(n) for n in notifications]

    def get_unread_count(self, user_id: uuid.UUID) -> int:
        return self.db.mongo.notifications.count_documents({"user_id": user_id, "read": False})

    def mark_read(self, user_id: uuid.UUID, notification_id: uuid.UUID) -> SafeNotification:
        notification = self.db.mongo.notifications.find_one_and_update(
            {"id": notification_id, "user_id": user_id},
            {"$set": {"read": True}},
        )
        if not notification:
            raise NotificationNotFound

        self.db.redis.hdel(f"users.notifications:{str(user_id)}", str(notification_id))

        return SafeNotification.model_validate({**notification, "read": True})

    def mark_all_read(self, user_id: uuid.UUID) -> None:
        result = self.db.mongo.notifications.update_many(
            {"user_id": user_id, "read": False},
            {"$set": {"read": True}},
        )
        if result.modified_count > 0:
            self.db.redis.delete(f"users.notifications:{str(user_id)}")

    # Push subscriptions

    def subscribe(self, user_id: uuid.UUID, endpoint: str, p256dh: str, auth: str, device_label: str | None = None) -> None:
        existing = self.db.mongo.push_subscriptions.find_one({"user_id": user_id, "endpoint": endpoint})
        if existing:
            update = {"p256dh": p256dh, "auth": auth}
            if device_label:
                update["device_label"] = device_label
            self.db.mongo.push_subscriptions.update_one({"_id": existing["_id"]}, {"$set": update})
            return
        subscription = PushSubscription(
            user_id=user_id,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth,
            device_label=device_label,
        )
        self.db.mongo.push_subscriptions.insert_one(subscription.model_dump())

    def set_subscription_enabled(self, user_id: uuid.UUID, endpoint: str, enabled: bool) -> bool:
        result = self.db.mongo.push_subscriptions.update_one(
            {"user_id": user_id, "endpoint": endpoint},
            {"$set": {"enabled": enabled}},
        )
        return result.matched_count > 0

    def list_subscriptions(self, user_id: uuid.UUID) -> list[PushSubscription]:
        subs = self.db.mongo.push_subscriptions.find({"user_id": user_id})
        return [PushSubscription.model_validate(sub) for sub in subs]

    def unsubscribe(self, user_id: uuid.UUID, endpoint: str) -> None:
        self.db.mongo.push_subscriptions.delete_one({"user_id": user_id, "endpoint": endpoint})

    def get_subscriptions(self, user_id: uuid.UUID, enabled_only: bool = False) -> list[PushSubscription]:
        query: dict = {"user_id": user_id}
        if enabled_only:
            query["enabled"] = True
        subs = self.db.mongo.push_subscriptions.find(query)
        return [PushSubscription.model_validate(sub) for sub in subs]

    def _send_to_subscription(self, subscription: PushSubscription, title: str, body: str, deep_link: str | None) -> bool:
        try:
            helper = make_vapid_helper()
            sent = helper.send(subscription.endpoint, subscription.p256dh, subscription.auth, title=title, body=body, url=deep_link)
            if sent:
                self._log_push("sent", subscription, title)
            else:
                self._log_push("skipped_no_vapid", subscription, title)
            return sent
        except pywebpush.WebPushException as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            self._log_push("failed", subscription, title, error=str(exc), status=status)
            if status in (404, 410):
                self.db.mongo.push_subscriptions.delete_one(
                    {"user_id": subscription.user_id, "endpoint": subscription.endpoint}
                )
            return False
        except Exception as exc:
            self._log_push("error", subscription, title, error=str(exc))
            return False

    def _log_push(self, event: str, subscription: PushSubscription, title: str, error: str | None = None, status: int | None = None) -> None:
        status_part = f" status={status}" if status is not None else ""
        error_part = f" error={error!r}" if error else ""
        print(f"[pusher] {event} host={push_host(subscription.endpoint)} device={subscription.device_label!r} title={title!r}{status_part}{error_part}", flush=True)

    def purge_user_notifications(self, user_id: uuid.UUID) -> None:
        self.db.mongo.notifications.delete_many({"user_id": user_id})
        self.db.mongo.push_subscriptions.delete_many({"user_id": user_id})
        self.db.redis.delete(f"users.notifications:{str(user_id)}")

    def delete_notification(self, user_id: uuid.UUID, notification_id: uuid.UUID) -> None:
        result = self.db.mongo.notifications.delete_one({"id": notification_id, "user_id": user_id})
        if result.deleted_count == 0:
            raise NotificationNotFound
        self.db.redis.hdel(f"users.notifications:{str(user_id)}", str(notification_id))

    def process_pending_pushes(self) -> None:
        now = datetime.datetime.now(datetime.timezone.utc)
        cutoff = (now - datetime.timedelta(hours=1)).isoformat().replace("+00:00", "Z")

        pending = list(
            self.db.mongo.notifications.find(
                {"pushed_at": None, "created_at": {"$gte": cutoff}}
            ).limit(200)
        )

        def handle(raw: dict) -> None:
            notification = Notification.model_validate(raw)
            if not self.get_settings_enabled(notification.user_id):
                self.db.mongo.notifications.update_one({"id": notification.id}, {"$set": {"pushed_at": now}})
                return

            subscriptions = self.get_subscriptions(notification.user_id, enabled_only=True)
            if not subscriptions:
                # Nothing to push to right now; mark so we don't rescan it every run.
                self.db.mongo.notifications.update_one({"id": notification.id}, {"$set": {"pushed_at": now}})
                return

            sent = False
            for subscription in subscriptions:
                if self._send_to_subscription(subscription, notification.title, notification.body, notification.deep_link):
                    sent = True

            if sent:
                self.db.mongo.notifications.update_one({"id": notification.id}, {"$set": {"pushed_at": now}})
                self.db.redis.hdel(f"users.notifications:{str(notification.user_id)}", str(notification.id))

        with ThreadPoolExecutor(max_workers=8) as executor:
            list(executor.map(handle, pending))