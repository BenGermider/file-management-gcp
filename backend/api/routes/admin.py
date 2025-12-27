from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_current_user
from db.database import get_db


from api.services.files import file_service

router = APIRouter()


@router.get(
    "/files",
)
async def list_all_files(
    db: AsyncSession = Depends(get_db),
    current_admin: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
    search: str = None,
    file_type: str = None
):
    return await file_service.list_files(
        db=db,
        current_user=current_admin,
        skip=skip,
        limit=limit,
        search=search,
        file_type=file_type,
        extension=current_admin.get("role", "user") == "admin"
    )
