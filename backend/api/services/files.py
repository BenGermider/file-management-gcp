import os
import uuid
import urllib.parse
import re
from io import BytesIO
from pathlib import Path
from typing import List
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from google.cloud import storage

from models.file import File
from core.settings import settings

ALLOWED_MIME_TYPES = {
    "application/json": ".json",
    "text/plain": ".txt",
    "application/pdf": ".pdf"
}

MAX_FILE_SIZE = 100 * 1024 * 1024
MAX_FILES_PER_UPLOAD = 10


class FileService:
    """Complete file management service"""

    def __init__(self):
        self.use_gcs = settings.USE_GCS == "true"
        if not self.use_gcs:
            self.local_dir = Path("uploads")
            self.local_dir.mkdir(exist_ok=True)

    def _get_gcs_bucket(self):
        """Get GCS bucket"""
        gcs_client = storage.Client()
        return gcs_client.bucket(settings.GCS_BUCKET_NAME)

    # Storage operations
    async def _upload_to_storage(self, file_id: str, content: bytes, path: str) -> None:
        if self.use_gcs:
            bucket = self._get_gcs_bucket()
            blob = bucket.blob(path)
            blob.upload_from_string(content)
        else:
            file_path = self.local_dir / path if isinstance(path, str) else path
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_bytes(content)

    async def _download_from_storage(self, path: str) -> bytes:
        if self.use_gcs:
            bucket = self._get_gcs_bucket()
            blob = bucket.blob(path)
            return blob.download_as_bytes()
        else:
            file_path = self.local_dir / path if isinstance(path, str) else path
            return file_path.read_bytes()

    async def _delete_from_storage(self, path: str) -> None:
        if self.use_gcs:
            bucket = self._get_gcs_bucket()
            blob = bucket.blob(path)
            blob.delete()
        else:
            file_path = self.local_dir / path if isinstance(path, str) else path
            if file_path.exists():
                file_path.unlink()

    def _generate_path(self, file_id: str, file_ext: str, user: dict) -> str:
        output = f"{user['sub']}/{file_id}{file_ext}"
        return output if self.use_gcs else str(self.local_dir / output)

    # Validation
    async def _validate_files(self, files: list) -> None:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        if len(files) > MAX_FILES_PER_UPLOAD:
            raise HTTPException(status_code=400, detail=f"Maximum {MAX_FILES_PER_UPLOAD} files per upload")

    async def _validate_and_extract_file(self, file) -> tuple:
        if not file.filename:
            raise HTTPException(status_code=400, detail="File has no name")

        content = await file.read()
        size = len(content)

        if size > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"File exceeds {MAX_FILE_SIZE / (1024*1024):.0f}MB")

        mime_type = file.content_type or "application/octet-stream"
        file_ext = ALLOWED_MIME_TYPES.get(mime_type)

        if not file_ext:
            raise HTTPException(status_code=400, detail=f"File type {mime_type} not allowed. Only .json, .txt, .pdf are accepted.")

        return str(uuid.uuid4()), mime_type, file_ext, content, size

    # Main operations
    async def upload_files(
        self,
        files: List,
        db: AsyncSession,
        current_user: dict
    ) -> dict:
        """Upload multiple files"""
        await self._validate_files(files)

        uploaded = []
        async with db.begin():
            for file in files:
                try:
                    file_id, mime_type, file_ext, content, size = await self._validate_and_extract_file(file)
                    path = self._generate_path(file_id, file_ext, current_user)
                    await self._upload_to_storage(file_id, content, path)

                    db_file = File(
                        id=file_id,
                        name=file.filename,
                        type=file_ext,
                        size=size,
                        owner=current_user["sub"],
                        file_path=path
                    )
                    db.add(db_file)
                    await db.commit()

                    uploaded.append({
                        "id": file_id,
                        "name": file.filename,
                        "type": file_ext,
                        "size": size
                    })
                except Exception as e:
                    await db.rollback()
                    raise HTTPException(status_code=500, detail=f"Failed to upload {file.filename}")

        return {"uploaded": uploaded, "count": len(uploaded)}

    async def list_files(
        self,
        db: AsyncSession,
        current_user: dict,
        skip: int = 0,
        limit: int = 50,
        search: str = None,
        file_type: str = None,
        extension: bool = False
    ) -> List[File]:
        """List user's files with optional search and filter"""
        if not extension:
            stmt = select(File).where(File.owner == current_user["sub"])
        else:
            stmt = select(File)

        if search:
            stmt = stmt.where(File.name.ilike(f"%{search}%"))
        if file_type:
            stmt = stmt.where(File.type == file_type)

        stmt = stmt.order_by(File.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()

    async def download_file(
        self,
        file_id: str,
        db: AsyncSession,
        current_user: dict
    ) -> StreamingResponse:
        """Download a file"""
        result = await db.execute(select(File).where(File.id == file_id))
        db_file = result.scalar_one_or_none()

        if not db_file:
            raise HTTPException(status_code=404, detail="File not found")
        if db_file.owner != current_user["sub"]:
            raise HTTPException(status_code=403, detail="Not authorized")

        try:
            content = await self._download_from_storage(db_file.file_path)
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to read file")

        filename = db_file.name
        quoted = urllib.parse.quote(filename)
        ascii_name = re.sub(r"[^\x00-\x7F]+", "_", filename)

        headers = {
            "Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{quoted}'
        }

        return StreamingResponse(BytesIO(content), media_type=db_file.type, headers=headers)

    async def delete_file(
        self,
        file_id: str,
        db: AsyncSession,
        current_user: dict
    ) -> None:
        """Delete a file"""
        result = await db.execute(select(File).where(File.id == file_id))
        db_file = result.scalar_one_or_none()

        if not db_file:
            raise HTTPException(status_code=404, detail="File not found")
        if db_file.owner != current_user["sub"]:
            raise HTTPException(status_code=403, detail="Not authorized")

        try:
            backup = await self._download_from_storage(db_file.file_path)
            await self._delete_from_storage(db_file.file_path)
            await db.delete(db_file)
            await db.commit()
        except Exception:
            await self._upload_to_storage(db_file.id, backup, db_file.file_path)
            await db.rollback()
            raise HTTPException(status_code=500, detail="Failed to delete file")


file_service = FileService()