from fastapi import APIRouter, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from decorators.valid_json import valid_json
from tools.deletions import DeletionTools
from tools.audit import audit_request


router = APIRouter()
deletion_tools = DeletionTools()


@router.get("/v1/deletions/me")
@require_auth()
async def get_my_deletion_request(request: Request) -> JSONResponse:
    deletion_request = deletion_tools.get_active_for_user(request.state.user.id)
    return JSONResponse(jsonable_encoder({"success": True, "request": deletion_request}))


@router.post("/v1/deletions/request")
@require_auth()
@valid_json(["reason"])
async def request_deletion(request: Request) -> JSONResponse:
    deletion_request = deletion_tools.request_deletion(request.state.user, request.state.json["reason"])

    audit_request(
        request,
        "delete_request",
        "user",
        resource_id=deletion_request.id,
        summary=f"Requested account deletion: {deletion_request.reason}",
    )

    return JSONResponse(
        jsonable_encoder(
            {
                "success": True,
                "message": "Your deletion request has been received. An administrator will review it shortly.",
                "request": deletion_request,
            }
        )
    )
