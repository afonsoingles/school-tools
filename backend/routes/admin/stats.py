from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from decorators.auth import require_auth
from utils.scheduler import scheduler
from jobs.update_stats import update_statistics
from tools.stats import StatisticTools


router = APIRouter()
tools = StatisticTools()


@router.get("/v1/admin/stats/user")
@require_auth(require_admin=True)
async def get_user_stats(request: Request) -> JSONResponse:

    user_stats = tools.get_user_stats()
    return JSONResponse({"success": True, "stats": user_stats.model_dump()})

@router.get("/v1/admin/stats/adoption")
@require_auth(require_admin=True)
async def get_adoption_stats(request: Request) -> JSONResponse:
    
    adoption_stats = tools.get_adoption_stats()
    return JSONResponse({"success": True, "stats": adoption_stats.model_dump()})

@router.get("/v1/admin/stats/functionality")
@require_auth(require_admin=True)
async def get_functionality_stats(request: Request) -> JSONResponse:

    functionality_stats = tools.get_functionality_stats()
    return JSONResponse({"success": True, "stats": functionality_stats.model_dump()})

@router.post("/v1/admin/stats")
@require_auth(require_superadmin=True)
async def update_stats(request: Request) -> JSONResponse:

    scheduler.add_job(
        update_statistics,
        id="stats.update.manual",
        replace_existing=True,
        misfire_grace_time=60,
    )

    return JSONResponse({"success": True, "message": "Stats update job scheduled."})
