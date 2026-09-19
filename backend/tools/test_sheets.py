from models.test_sheets import (
    TestSheetStock,
    SafeTestSheetStock,
    TestSheetUsage,
    SafeTestSheetUsage,
    LOW_STOCK_THRESHOLD,
)
from errors.test_sheets import *
from utils.database import Database
from tools.users import UserTools
from tools.evaluations import EvaluationTools
from tools.classes import ClassTools
from tools.subjects import SubjectTools
from zoneinfo import ZoneInfo
import uuid
import datetime

MAX_AMOUNT = 1000


def test_sheet_envelope(stock, **extra) -> dict:
    return {
        "success": True,
        "enabled": stock.enabled,
        "stock": {"lined": stock.lined, "graph": stock.graph},
        **extra,
    }


class TestSheetTools:
    def __init__(self) -> None:
        self.db = Database()
        self.user_tools = UserTools()
        self.evaluation_tools = EvaluationTools()
        self.class_tools = ClassTools()
        self.subject_tools = SubjectTools()

    def _now(self) -> datetime.datetime:
        return datetime.datetime.now(datetime.timezone.utc)

    def _validate_amount(self, amount: int) -> int:
        try:
            value = int(amount)
        except Exception:
            raise InvalidTestSheetAmount
        if value < 0 or value > MAX_AMOUNT:
            raise InvalidTestSheetAmount
        return value

    def get_stock(self, user_id: uuid.UUID) -> TestSheetStock:
        raw = self.db.mongo.test_sheet_stocks.find_one({"user_id": user_id})
        if not raw:
            return TestSheetStock(user_id=user_id)
        return TestSheetStock.model_validate(raw)

    def set_enabled(self, user_id: uuid.UUID, enabled: bool) -> TestSheetStock:
        stock = self.get_stock(user_id)
        stock.enabled = bool(enabled)
        if enabled and stock.granted_at is None:
            stock.granted_at = self._now()
        stock.updated_at = self._now()

        doc = stock.model_dump()
        self.db.mongo.test_sheet_stocks.update_one(
            {"user_id": user_id},
            {"$set": doc},
            upsert=True,
        )
        return stock

    def update_stock(self, user_id: uuid.UUID, lined: int = 0, graph: int = 0, action: str = "add") -> TestSheetStock:
        stock = self.get_stock(user_id)
        if not stock.enabled:
            raise TestSheetsDisabled

        lined_amount = self._validate_amount(lined)
        graph_amount = self._validate_amount(graph)

        if action == "remove":
            stock.lined = max(0, stock.lined - lined_amount)
            stock.graph = max(0, stock.graph - graph_amount)
        else:
            stock.lined += lined_amount
            stock.graph += graph_amount
        stock.updated_at = self._now()

        self.db.mongo.test_sheet_stocks.update_one(
            {"user_id": user_id},
            {"$set": stock.model_dump()},
            upsert=True,
        )
        return stock

    def get_reconciled_evaluation_ids(self, user_id: uuid.UUID) -> set[str]:
        raw = self.db.mongo.test_sheet_usages.find({"user_id": user_id}, {"evaluation_id": 1})
        return {str(doc["evaluation_id"]) for doc in raw}

    def get_pending_evaluations(self, user_id: uuid.UUID) -> list[dict]:
        stock = self.get_stock(user_id)
        if not stock.enabled:
            return []

        try:
            user = self.user_tools.get_user_by_id(user_id)
            tz = ZoneInfo(str(user.timezone))
        except Exception:
            tz = ZoneInfo("Etc/Universal")

        now_local = self._now().astimezone(tz)
        today = now_local.date()
        granted_date = stock.granted_at.astimezone(tz).date() if stock.granted_at else None

        reconciled = self.get_reconciled_evaluation_ids(user_id)

        subjects = {str(s.id): s.name for s in self.subject_tools.get_user_subjects(user_id)}
        classes = {str(c.id): c for c in self.class_tools.get_user_class_schedule(user_id)}

        pending: list[dict] = []
        for evaluation in self.evaluation_tools.get_user_evaluations(user_id):
            eval_date = evaluation.date
            if eval_date.tzinfo is not None:
                eval_date = eval_date.astimezone(tz).replace(tzinfo=None)

            if eval_date.date() >= today:
                continue
            if granted_date and eval_date.date() < granted_date:
                continue
            if str(evaluation.id) in reconciled:
                continue

            class_event = classes.get(str(evaluation.class_id))
            subject = subjects.get(str(class_event.subject_id), "") if class_event else ""
            pending.append(
                {
                    "id": evaluation.id,
                    "class_id": evaluation.class_id,
                    "date": eval_date,
                    "type": evaluation.type,
                    "subject": subject,
                }
            )

        pending.sort(key=lambda item: item["date"], reverse=True)
        return pending

    def reconcile(self, user_id: uuid.UUID, evaluation_id: uuid.UUID, lined: int = 0, graph: int = 0) -> TestSheetStock:
        stock = self.get_stock(user_id)
        if not stock.enabled:
            raise TestSheetsDisabled

        lined = self._validate_amount(lined)
        graph = self._validate_amount(graph)

        evaluation = self.db.mongo.evaluations.find_one({"id": evaluation_id, "user_id": user_id})
        if not evaluation:
            raise TestSheetEvaluationNotFound

        if self.db.mongo.test_sheet_usages.find_one({"user_id": user_id, "evaluation_id": evaluation_id}):
            raise TestSheetAlreadyReconciled

        usage = TestSheetUsage(
            user_id=user_id,
            evaluation_id=evaluation_id,
            lined=lined,
            graph=graph,
        )
        usage_doc = usage.model_dump()
        usage_doc["_id"] = usage.id
        self.db.mongo.test_sheet_usages.insert_one(usage_doc)

        stock.lined = max(0, stock.lined - lined)
        stock.graph = max(0, stock.graph - graph)
        stock.updated_at = self._now()
        self.db.mongo.test_sheet_stocks.update_one(
            {"user_id": user_id},
            {"$set": stock.model_dump()},
            upsert=True,
        )
        return stock

    def is_low(self, stock: SafeTestSheetStock) -> bool:
        return (stock.lined + stock.graph) <= LOW_STOCK_THRESHOLD


test_sheet_tools = TestSheetTools()
