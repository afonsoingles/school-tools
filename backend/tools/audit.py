from models.audit import AuditLog, SafeAuditLog
from utils.database import Database
import uuid
import datetime


def _as_iso(v: datetime.datetime) -> str:
    return v.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z")


def audit_request(request, action: str, resource: str, resource_id: str | uuid.UUID | None = None, summary: str = "") -> None:
    AuditTools().log(
        user_id=request.state.user.id,
        action=action,
        resource=resource,
        resource_id=resource_id,
        summary=summary,
        via=getattr(request.state, "via", "web"),
    )


class AuditTools:
    def __init__(self) -> None:
        self.db = Database()

    def log(self, user_id: uuid.UUID, action: str, resource: str, resource_id: str | uuid.UUID | None = None, summary: str = "", via: str = "web") -> None:
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=str(resource_id) if resource_id else None,
            summary=summary,
            via=via,
        )
        self.db.mongo.audit_logs.insert_one(log_entry.model_dump())

    def get_audit_logs(self, limit: int = 50, offset: int = 0, user_id: str | None = None, resource: str | None = None, action: str | None = None, via: str | None = None, created_from: datetime.datetime | None = None, created_to: datetime.datetime | None = None) -> tuple[list[SafeAuditLog], int]:
        filters = []
        if user_id:
            try:
                filters.append({"user_id": uuid.UUID(user_id)})
            except (ValueError, TypeError, AttributeError):
                return [], 0
        if resource:
            filters.append({"resource": resource})
        if action:
            filters.append({"action": action})
        if via:
            filters.append({"via": via})
        if created_from:
            filters.append({"created_at": {"$gte": _as_iso(created_from)}})
        if created_to:
            filters.append({"created_at": {"$lte": _as_iso(created_to)}})

        query = {"$and": filters} if filters else {}
        total = self.db.mongo.audit_logs.count_documents(query)
        raw = (self.db.mongo.audit_logs.find(query)
               .sort("created_at", -1).skip(offset).limit(limit))
        logs = [
            AuditLog.model_validate(doc) for doc in raw
        ]
        return [SafeAuditLog.model_validate(log) for log in logs], total

    def purge_user_logs(self, user_id: uuid.UUID) -> None:
        self.db.mongo.audit_logs.delete_many({"user_id": user_id})