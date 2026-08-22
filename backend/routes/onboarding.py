from fastapi import APIRouter, Request, UploadFile
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from errors.onboarding import *
import json

router = APIRouter()

@router.post("/v1/onboarding/import")
@require_auth(require_admin=True)
async def onboarding_import_data(request: Request) -> JSONResponse:

    FILE_SIZE_LIMIT = 10 * 1024 * 1024 #10MB
    content_length = request.headers.get("content-length")

    if content_length and int(content_length) > FILE_SIZE_LIMIT:
        raise FileSizeLimitExceeded
    
    form = await request.form()
    file = form.get("file")

    if not isinstance(file, UploadFile):
        raise NoFileProvided
    
    if not file.filename or not file.filename.lower().endswith(".json"):
        raise InvalidFileType

    try:
        data = await file.read(FILE_SIZE_LIMIT + 1)
    except:
        raise InvalidFileContent
    finally:
        await file.close()

    try:
        data = data.decode("utf-8")
        json.loads(data)
    except:
        raise InvalidFileContent
    
    # scheduler.add_job...
    return JSONResponse({"success": True, "message": "i"})