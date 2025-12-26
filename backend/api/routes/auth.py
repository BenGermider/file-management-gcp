from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from api.services.auth import AuthService

router = APIRouter(tags=["auth"])


@router.get("/google")
async def google_login():
    url = await AuthService.get_google_login_url()
    return RedirectResponse(url)


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Code not provided")

    try:
        result = await AuthService.handle_google_callback(code, db)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))