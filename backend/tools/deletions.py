from models.deletion import DeletionRequest, DeletionStatus
from models.notification import NotificationType
from models.user import User
from errors.deletions import *
from errors.user import UserNotFoundError
from utils.database import Database
from utils.mailer import Mailer
from tools.users import UserTools
from tools.sessions import SessionTools
from tools.notifications import NotificationTools
from tools.audit import AuditTools
import uuid
import datetime


UNVERIFIED_NOMINATE_DAYS = 7
DELETION_GRACE_HOURS = 48

USER_COLLECTIONS = [
    "subjects",
    "classes",
    "class_cancellations",
    "day_cancellations",
    "evaluations",
    "homework",
    "calendar_feeds",
    "calendar_feed_settings",
    "notifications",
    "push_subscriptions",
    "api_keys",
    "audit_logs",
    "test_sheet_stocks",
    "test_sheet_usages",
]


class DeletionTools:
    def __init__(self) -> None:
        self.db = Database()
        self.user_tools = UserTools()
        self.session_tools = SessionTools()
        self.notification_tools = NotificationTools()
        self.audit_tools = AuditTools()
        self.mailer = Mailer()

    def _now(self) -> datetime.datetime:
        return datetime.datetime.now(datetime.timezone.utc)

    def _insert(self, request: DeletionRequest) -> DeletionRequest:
        doc = request.model_dump()
        doc["_id"] = request.id
        self.db.mongo.deletion_requests.insert_one(doc)
        return DeletionRequest.model_validate(doc)

    def _deactivate(self, user: User) -> None:
        if user.active:
            self.user_tools.update_user(user.id, safe_update=False, active=False)
        self.session_tools.revoke_user_sessions(user.id)

    def _notify_admins(self, title: str, body: str, deep_link: str | None = None) -> None:
        admins, _ = self.user_tools.get_users(role="admin", limit=200)
        for admin in admins:
            self.notification_tools.create(admin.id, NotificationType.DELETION, title, body, deep_link)

    # Queries

    def get_request(self, request_id: uuid.UUID) -> DeletionRequest:
        raw = self.db.mongo.deletion_requests.find_one({"id": request_id})
        if not raw:
            raise DeletionRequestNotFound
        return DeletionRequest.model_validate(raw)

    def get_active_for_user(self, user_id: uuid.UUID) -> DeletionRequest | None:
        raw = self.db.mongo.deletion_requests.find_one(
            {"user_id": user_id, "status": {"$in": [DeletionStatus.PENDING.value, DeletionStatus.APPROVED.value]}}
        )
        return DeletionRequest.model_validate(raw) if raw else None

    def list_requests(self, status: str | None = None, limit: int = 50, offset: int = 0) -> tuple[list[DeletionRequest], int]:
        query = {}
        if status in (DeletionStatus.PENDING.value, DeletionStatus.APPROVED.value, DeletionStatus.REVERSED.value, DeletionStatus.COMPLETED.value):
            query = {"status": status}
        total = self.db.mongo.deletion_requests.count_documents(query)
        raw = (
            self.db.mongo.deletion_requests.find(query)
            .sort("requested_at", -1)
            .skip(offset)
            .limit(limit)
        )
        return [DeletionRequest.model_validate(doc) for doc in raw], total

    # Mutations

    def request_deletion(self, user: User, reason: str) -> DeletionRequest:
        reason = (reason or "").strip()
        if len(reason) < 3 or len(reason) > 500:
            raise InvalidDeletionReason

        if self.get_active_for_user(user.id):
            raise DeletionAlreadyPending

        request = self._insert(
            DeletionRequest(
                user_id=user.id,
                email=user.email,
                name=user.name,
                reason=reason,
            )
        )

        self._deactivate(user)

        self.mailer.send_email(
            subject="We received your deletion request",
            template="deletion_requested_en",
            to=user.email,
            name=user.name,
        )
        self._notify_admins(
            "New deletion request",
            f"{user.name} ({user.email}) requested account deletion.",
            "/admin/deletions",
        )

        return request

    def nominate(self, user_id: uuid.UUID, reason: str, admin: User) -> DeletionRequest:
        user = self.user_tools.get_user_by_id(user_id)
        if user.superadmin or (user.admin and not admin.superadmin):
            raise DeletionNotApprovable

        if self.get_active_for_user(user.id):
            raise DeletionAlreadyPending

        reason = (reason or "").strip() or f"Nominated by {admin.name}."
        return self._insert(
            DeletionRequest(
                user_id=user.id,
                email=user.email,
                name=user.name,
                reason=reason,
                nominated=True,
            )
        )

    def approve(self, request_id: uuid.UUID, admin: User) -> DeletionRequest:
        request = self.get_request(request_id)
        if request.status != DeletionStatus.PENDING:
            raise DeletionNotApprovable

        user = self.user_tools.get_user_by_id(request.user_id)

        if request.nominated:
            self._deactivate(user)

        now = self._now()
        self.db.mongo.deletion_requests.update_one(
            {"id": request.id},
            {
                "$set": {
                    "status": DeletionStatus.APPROVED.value,
                    "reviewed_at": now,
                    "reviewed_by": admin.id,
                    "scheduled_purge_at": now + datetime.timedelta(hours=DELETION_GRACE_HOURS),
                }
            },
        )

        self.mailer.send_email(
            subject="Your account will be deleted",
            template="deletion_approved_en",
            to=request.email,
            name=request.name,
        )

        return self.get_request(request.id)

    def reverse(self, request_id: uuid.UUID, admin: User) -> DeletionRequest:
        request = self.get_request(request_id)
        if request.status not in (DeletionStatus.PENDING, DeletionStatus.APPROVED):
            raise DeletionNotReversible

        now = self._now()
        try:
            user = self.user_tools.get_user_by_id(request.user_id)
            if not user.active:
                self.user_tools.update_user(user.id, safe_update=False, active=True)
        except UserNotFoundError:
            pass

        self.db.mongo.deletion_requests.update_one(
            {"id": request.id},
            {"$set": {"status": DeletionStatus.REVERSED.value, "reversed_at": now, "reviewed_at": now, "reviewed_by": admin.id}},
        )

        self.mailer.send_email(
            subject="Your account has been restored",
            template="deletion_reversed_en",
            to=request.email,
            name=request.name,
        )

        return self.get_request(request.id)

    # Purge

    def purge_user_data(self, user_id: uuid.UUID, email: str | None = None) -> None:
        user_id = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))

        if not email:
            raw = self.db.mongo.users.find_one({"id": user_id}, {"email": 1})
            email = raw.get("email") if raw else None

        api_key_docs = list(self.db.mongo.api_keys.find({"user_id": user_id}, {"key_hash": 1, "id": 1}))

        self.session_tools.revoke_user_sessions(user_id)

        for collection in USER_COLLECTIONS:
            self.db.mongo[collection].delete_many({"user_id": user_id})
        self.db.mongo.users.delete_one({"id": user_id})

        uid = str(user_id)
        keys = [
            f"users.user:{uid}",
            f"users.sessions.map:{uid}",
            f"users.verification:{uid}",
            f"users.password_reset:{uid}",
            f"users.notifications:{uid}",
            f"users.calendar.settings:{uid}",
            f"users.calendar.dirty.count:{uid}",
            f"users.holidays.settings:{uid}",
        ]
        for base in ("evaluations", "homework", "subjects", "classes", "day_cancellations", "class_cancellations", "notifications"):
            keys.append(f"users.{base}:{uid}")
            keys.append(f"users.{base}.is_empty:{uid}")
        for doc in api_key_docs:
            keys.append(f"users.api_keys.hash:{doc['key_hash']}")
            keys.append(f"users.api_keys.last_used:{doc['id']}")

        if email:
            keys.append(f"users.lookup.email:{email}")

        for pattern in (f"users.calendar.feeds.*:{uid}", f"*:{uid}:*"):
            for key in self.db.redis.scan_iter(match=pattern, count=500):
                keys.append(key)

        self.db.redis.delete(*keys)
        self.db.redis.srem("users.calendar.dirty", uid)
        self.user_tools.invalidate_admin_users_lists()

    def purge(self, request_id: uuid.UUID) -> DeletionRequest:
        request = self.get_request(request_id)
        if request.status == DeletionStatus.COMPLETED:
            return request
        if request.status != DeletionStatus.APPROVED:
            raise DeletionNotApprovable

        self.purge_user_data(request.user_id, request.email)

        self.db.mongo.deletion_requests.update_one(
            {"id": request.id},
            {"$set": {"status": DeletionStatus.COMPLETED.value, "completed_at": self._now()}},
        )
        return self.get_request(request.id)

    def process_daily_purges(self) -> int:
        now = self._now()
        raw = self.db.mongo.deletion_requests.find(
            {
                "status": DeletionStatus.APPROVED.value,
                "$or": [
                    {"scheduled_purge_at": None},
                    {"scheduled_purge_at": {"$lte": now}},
                ],
            }
        )
        purged = 0
        for doc in raw:
            self.purge(doc["id"])
            purged += 1
        return purged

    def auto_nominate_unverified(self, days: int = UNVERIFIED_NOMINATE_DAYS) -> int:
        cutoff = (self._now() - datetime.timedelta(days=days)).isoformat().replace("+00:00", "Z")
        raw = self.db.mongo.users.find(
            {"email_verified": False, "active": True, "created_at": {"$lte": cutoff}}
        )
        nominated = 0
        for doc in raw:
            user = User.model_validate(doc)
            if self.get_active_for_user(user.id):
                continue
            self._insert(
                DeletionRequest(
                    user_id=user.id,
                    email=user.email,
                    name=user.name,
                    reason=f"Automatically nominated: email unverified for over {days} days.",
                    nominated=True,
                )
            )
            nominated += 1
        return nominated
