import re
import urllib
import uuid
import mimetypes
from typing import List
from io import BytesIO

from starlette import status
from starlette.status import (
    HTTP_204_NO_CONTENT,
    HTTP_201_CREATED,
    HTTP_404_NOT_FOUND,
    HTTP_403_FORBIDDEN,
    HTTP_400_BAD_REQUEST
)
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.services.storage import storage_service, StorageService
from models.file import File
from api.dependencies import get_current_user


from db.database import get_db


router = APIRouter(tags=["files"])

ALLOWED_MIME_TYPES = {
    "application/json": ".json",
    "text/plain": ".txt",
    "application/pdf": ".pdf"
}


async def _extract_file_data(file: UploadFile) -> tuple:
    file_content = await file.read()
    file_id = str(uuid.uuid4())
    mime_type = file.content_type or "application/octet-stream"
    file_ext = ALLOWED_MIME_TYPES.get(mime_type)

    return len(file_content), file_content, file_id, file_ext, mime_type


@router.post("/upload")
async def upload_files(
    files: List[UploadFile],
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload multiple files to Google Cloud Storage.
    Returns metadata for each uploaded file.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per upload")

    async with db.begin():
        uploaded = []

        for file in files:

            if not file.filename:
                continue

            size, content, file_id, file_ext, mime_type = await(_extract_file_data(file))

            if size > 100 * 1024 * 1024:
                raise HTTPException(status_code=413, detail=f"File {file.filename} exceeds 100MB")

            if not file_ext:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File type {mime_type} not allowed. Only .json, .txt, .pdf are accepted."
                )


            path = await storage_service.generate_path(file_id, file_ext, current_user)

            try:
                # Upload to storage (local or GCS)
                await storage_service.upload(file_id, content, path)
                db_file = File(
                    id=file_id,
                    name=file.filename,
                    type=file_ext or "application/octet-stream",
                    size=size,
                    owner=current_user["sub"],
                    file_path=path
                )
                db.add(db_file)

                uploaded.append({
                    "id": file_id,
                    "name": file.filename,
                    "type": file_ext,
                    "size": size
                })
                await db.commit()

            except Exception as e:
                await db.rollback()
                # rollback DB and delete uploaded files
                for path in uploaded:
                    await storage_service.delete(path)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to upload {file.filename}: {e}"
                )

    return {"uploaded": uploaded, "count": len(uploaded)}


@router.get("")
async def list_files(
        skip: int = 0,
        limit: int = 50,
        search: str = None,
        file_type: str = None,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    stmt = select(File).where(File.owner == current_user["sub"])

    if search:
        stmt = stmt.where(File.name.ilike(f"%{search}%"))

    if file_type:
        stmt = stmt.where(File.type == file_type)

    stmt = stmt.order_by(File.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    result = await db.execute(select(File).where(File.id == file_id))
    db_file = result.scalar_one_or_none()

    if not db_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File {file_id} not found"
        )

    if db_file.owner != current_user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to download this file"
        )

    # Download file from storage
    try:
        file_content = await storage_service.download(db_file.file_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read file from storage: {str(e)}"
        )

    # Return as streaming response
    return _bilingual_stream(
        db_file, file_content
    )

def _bilingual_stream(db_file: File, file_content) -> StreamingResponse:

    def ascii_fallback(name: str) -> str:
        # Remove non-ASCII characters
        return re.sub(r"[^\x00-\x7F]+", "_", name)

    filename = db_file.name
    quoted_filename = urllib.parse.quote(filename)

    headers = {
        "Content-Disposition": (
            f"attachment; "
            f'filename="{ascii_fallback(filename)}"; '
            f"filename*=UTF-8''{quoted_filename}"
        )
    }

    return StreamingResponse(
        BytesIO(file_content),
        media_type=db_file.type,
        headers=headers,
    )
@router.delete(
    "/{file_id}",
    status_code=HTTP_204_NO_CONTENT
)
async def delete_file(
    file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    result = await db.execute(select(File).where(File.id == file_id))
    db_file = result.scalar_one_or_none()

    if not db_file:
        raise HTTPException(HTTP_404_NOT_FOUND, "File not found")

    if db_file.owner != current_user["sub"]:
        raise HTTPException(HTTP_403_FORBIDDEN, "Forbidden")

    try:
        backup_content = await storage_service.download(db_file.file_path)
    except Exception as e:
        raise HTTPException(500, f"Failed to read file before delete: {e}")

    try:
        await storage_service.delete(db_file.file_path)
    except Exception as e:
        raise HTTPException(500, f"Failed to delete from storage: {e}")

    try:
        await db.delete(db_file)
        await db.commit()
    except Exception as e:
        await storage_service.upload(
            db_file.id,
            backup_content,
            db_file.file_path
        )
        await db.rollback()
        raise HTTPException(
            500,
            f"DB delete failed, storage restored: {e}"
        )
    return
