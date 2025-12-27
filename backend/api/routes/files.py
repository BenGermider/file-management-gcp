from typing import List
from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from api.services.files import file_service
from api.dependencies import get_current_user
from db.database import get_db
from starlette.status import HTTP_204_NO_CONTENT, HTTP_201_CREATED

router = APIRouter(tags=["files"])


@router.get("")
async def list_files(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
    search: str = None,
    file_type: str = None
):
    return await file_service.list_files(
        db=db,
        current_user=current_user,
        skip=skip,
        limit=limit,
        search=search,
        file_type=file_type
    )


@router.post("/upload", status_code=HTTP_201_CREATED)
async def upload_files(
    files: List[UploadFile],
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return await file_service.upload_files(files, db, current_user)


@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return await file_service.download_file(file_id, db, current_user)


@router.delete("/{file_id}", status_code=HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    await file_service.delete_file(file_id, db, current_user)
