from fastapi import APIRouter, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from decorators.valid_json import valid_json
from tools.test_sheets import TestSheetTools, test_sheet_envelope
from tools.audit import audit_request
from errors.user import UserNotFoundError
import uuid


router = APIRouter()
test_sheet_tools = TestSheetTools()


def _parse_user_id(user_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(user_id)
    except (ValueError, TypeError, AttributeError):
        raise UserNotFoundError


@router.get("/v1/admin/users/{user_id}/test-sheets")
@require_auth(require_admin=True)
async def get_user_test_sheets(request: Request, user_id: str) -> JSONResponse:
    stock = test_sheet_tools.get_stock(_parse_user_id(user_id))
    return JSONResponse(
        jsonable_encoder(test_sheet_envelope(stock, granted_at=stock.granted_at))
    )


@router.patch("/v1/admin/users/{user_id}/test-sheets")
@require_auth(require_admin=True)
@valid_json(["enabled"])
async def set_user_test_sheets(request: Request, user_id: str) -> JSONResponse:
    user_uuid = _parse_user_id(user_id)
    enabled = bool(request.state.json["enabled"])
    stock = test_sheet_tools.set_enabled(user_uuid, enabled)

    audit_request(
        request,
        "update",
        "test_sheet",
        resource_id=user_uuid,
        summary=f"{'Enabled' if enabled else 'Disabled'} test sheets for {user_uuid}",
    )

    return JSONResponse(
        jsonable_encoder(test_sheet_envelope(stock, granted_at=stock.granted_at))
    )
