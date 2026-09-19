from fastapi import APIRouter, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from decorators.valid_json import valid_json
from tools.api_keys import ApiKeyTools
from tools.audit import audit_request
from errors.api_keys import *
import uuid


router = APIRouter()
api_key_tools = ApiKeyTools()


@router.post("/v1/account/api-keys")
@require_auth
@valid_json(["name"])
async def create_api_key(request: Request) -> JSONResponse:
    safe_key, raw = api_key_tools.create_key(request.state.user.id, request.state.json["name"])
    audit_request(request, "create", "api_key", resource_id=safe_key.id, summary=f"Created API key '{safe_key.name}'")
    return JSONResponse(jsonable_encoder({"success": True, "api_key": safe_key.model_dump(), "raw_key": raw}), status_code=201)

@router.get("/v1/account/api-keys")
@require_auth
async def get_api_keys(request: Request) -> JSONResponse:
    keys = api_key_tools.get_user_keys(request.state.user.id)
    return JSONResponse(jsonable_encoder({"success": True, "api_keys": [key.model_dump() for key in keys]}))

@router.delete("/v1/account/api-keys/{key_id}")
@require_auth
async def revoke_api_key(request: Request, key_id: str) -> JSONResponse:
    try:
        key_uuid = uuid.UUID(key_id)
    except:
        raise ApiKeyNotFound

    safe_key = api_key_tools.revoke_key(request.state.user.id, key_uuid)
    audit_request(request, "delete", "api_key", resource_id=safe_key.id, summary=f"Revoked API key '{safe_key.name}'")
    return JSONResponse(jsonable_encoder({"success": True, "api_key": safe_key.model_dump()}))