from fastapi import APIRouter, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from decorators.valid_json import valid_json
from tools.test_sheets import TestSheetTools, test_sheet_envelope
from tools.audit import audit_request
from errors.test_sheets import TestSheetEvaluationNotFound
import uuid


router = APIRouter()
test_sheet_tools = TestSheetTools()


@router.get("/v1/test-sheets")
@require_auth
async def get_test_sheets(request: Request) -> JSONResponse:
    user_id = request.state.user.id
    stock = test_sheet_tools.get_stock(user_id)
    pending = test_sheet_tools.get_pending_evaluations(user_id)

    return JSONResponse(
        jsonable_encoder(
            test_sheet_envelope(
                stock,
                low=test_sheet_tools.is_low(stock),
                pending=pending,
            )
        )
    )


@router.patch("/v1/test-sheets/stock")
@require_auth
@valid_json([])
async def update_test_sheet_stock(request: Request) -> JSONResponse:
    data = request.state.json
    action = "remove" if data.get("action") == "remove" else "add"
    lined = data.get("lined") or 0
    graph = data.get("graph") or 0
    stocked = test_sheet_tools.update_stock(
        request.state.user.id,
        lined=lined,
        graph=graph,
        action=action,
    )

    audit_request(
        request,
        action,
        "test_sheet",
        resource_id=request.state.user.id,
        summary=f"{'Added' if action == 'add' else 'Removed'} test sheets (lined={lined}, graph={graph})",
    )

    return JSONResponse(
        jsonable_encoder(
            test_sheet_envelope(
                stocked,
                low=test_sheet_tools.is_low(stocked),
                pending=test_sheet_tools.get_pending_evaluations(request.state.user.id),
            )
        )
    )


@router.post("/v1/test-sheets/reconcile")
@require_auth
@valid_json(["evaluation_id"])
async def reconcile_test_sheets(request: Request) -> JSONResponse:
    data = request.state.json
    try:
        evaluation_id = uuid.UUID(str(data["evaluation_id"]))
    except Exception:
        raise TestSheetEvaluationNotFound

    stocked = test_sheet_tools.reconcile(
        request.state.user.id,
        evaluation_id,
        lined=data.get("lined") or 0,
        graph=data.get("graph") or 0,
    )

    audit_request(
        request,
        "reconcile",
        "test_sheet",
        resource_id=evaluation_id,
        summary=f"Reconciled sheets (lined={data.get('lined') or 0}, graph={data.get('graph') or 0})",
    )

    return JSONResponse(
        jsonable_encoder(
            test_sheet_envelope(
                stocked,
                low=test_sheet_tools.is_low(stocked),
                pending=test_sheet_tools.get_pending_evaluations(request.state.user.id),
            )
        )
    )
