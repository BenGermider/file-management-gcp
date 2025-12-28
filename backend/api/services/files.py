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
from elasticsearch import AsyncElasticsearch
from starlette import status
from models.file import File
from core.settings import settings
from core.metrics import files_uploaded, upload_size_bytes, files_downloaded, download_size_bytes, files_deleted
from starlette.status import HTTP_401_UNAUTHORIZED

ALLOWED_MIME_TYPES = {
    "application/json": ".json",
    "text/plain": ".txt",
    "application/pdf": ".pdf"
}

MAX_FILE_SIZE = 100 * 1024 * 1024
MAX_FILES_PER_UPLOAD = 10


class FileService:

    def __init__(self):
        self.use_gcs = settings.USE_GCS == "true"
        if not self.use_gcs:
            self.local_dir = Path("uploads")
            self.local_dir.mkdir(exist_ok=True)

        self.es = AsyncElasticsearch(["http://elasticsearch:9200"])
        self.index_name = "files"

    async def init(self):
        await self._create_search_index()

    async def close(self):
        await self.es.close()

    async def _create_search_index(self):
        index_exists = await self.es.indices.exists(index=self.index_name)
        if not index_exists:
            await self.es.indices.create(
                index=self.index_name,
                body={
                    "settings": {
                        "number_of_shards": 1,
                        "number_of_replicas": 0,
                        "index.max_ngram_diff": 20,
                        "analysis": {
                            "analyzer": {
                                "ngram_analyzer": {
                                    "type": "custom",
                                    "tokenizer": "ngram_tokenizer",
                                    "filter": ["lowercase"]
                                }
                            },
                            "tokenizer": {
                                "ngram_tokenizer": {
                                    "type": "ngram",
                                    "min_gram": 2,
                                    "max_gram": 20
                                }
                            }
                        }
                    },
                    "mappings": {
                        "properties": {
                            "file_id": {"type": "keyword"},
                            "content": {
                                "type": "text",
                                "analyzer": "ngram_analyzer",
                                "search_analyzer": "standard"
                            }
                        }
                    }
                }
            )

    async def _index_file_content(self, file_id: str, content: str) -> None:
        try:
            await self.es.index(
                index=self.index_name,
                id=file_id,
                body={"content": content}
            )
        except Exception as e:
            raise Exception(f"Failed to index file {file_id}: {str(e)}")

    async def _search_file_content(
            self,
            query: str,
            limit: int = 50
    ) -> list:
        try:
            es_query = {
                "query": {
                    "match": {
                        "content": {
                            "query": query,
                            "fuzziness": "AUTO"
                        }
                    }
                },
                "size": limit
            }

            results = await self.es.search(index=self.index_name, body=es_query)
            return [hit["_id"] for hit in results["hits"]["hits"]]

        except Exception as e:
            raise Exception(f"Search failed: {str(e)}")

    async def _delete_from_search_index(self, file_id: str) -> None:
        try:
            await self.es.delete(index=self.index_name, id=file_id, ignore=[404])
        except Exception as e:
            raise Exception(f"Failed to delete from index: {str(e)}")

    @staticmethod
    def _get_gcs_bucket():
        gcs_client = storage.Client(project=settings.GCP_PROJECT_ID)
        return gcs_client.bucket(settings.GCS_BUCKET_NAME)

    async def _upload_to_storage(self, content: bytes, path: str) -> None:
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
        output = f"{user['user_id']}/{file_id}{file_ext}"  # Use user_id instead of email
        return output if self.use_gcs else str(self.local_dir / output)

    @staticmethod
    async def _validate_files(files: list) -> None:
        if not files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No files provided"
            )
        if len(files) > MAX_FILES_PER_UPLOAD:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Maximum {MAX_FILES_PER_UPLOAD} files per upload"
            )

    @staticmethod
    async def _validate_and_extract_file(file) -> tuple:
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="File has no name"
            )

        content = await file.read()
        size = len(content)

        if size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds {MAX_FILE_SIZE / (1024 * 1024):.0f}MB"
            )

        mime_type = file.content_type or "application/octet-stream"
        file_ext = ALLOWED_MIME_TYPES.get(mime_type)

        if not file_ext:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"File type {mime_type} not allowed. Only .json, .txt, .pdf are accepted."
            )

        return str(uuid.uuid4()), mime_type, file_ext, content, size

    @staticmethod
    async def _extract_text(content: bytes, file_ext: str) -> str:
        try:
            if file_ext == ".pdf":
                import PyPDF2
                pdf_reader = PyPDF2.PdfReader(BytesIO(content))
                text = "".join(page.extract_text() for page in pdf_reader.pages)
                return text[:10000]
            elif file_ext == ".txt":
                return content.decode('utf-8')[:10000]
            elif file_ext == ".json":
                import json
                return json.dumps(json.loads(content))[:10000]

        except Exception as e:
            print(f"Text extraction failed: {e}")
            return ""

    async def upload_files(
            self,
            files: List,
            db: AsyncSession,
            current_user: dict
    ) -> dict:
        await self._validate_files(files)

        uploaded = []
        async with db.begin():
            for file in files:
                try:
                    file_id, mime_type, file_ext, content, size = await self._validate_and_extract_file(file)
                    path = self._generate_path(file_id, file_ext, current_user)
                    await self._upload_to_storage(file_id, content, path)

                    extracted_text = await self._extract_text(content, file_ext)
                    await self._index_file_content(file_id, extracted_text)

                    db_file = File(
                        id=file_id,
                        name=file.filename,
                        type=file_ext,
                        size=size,
                        owner_id=current_user["user_id"],
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

                    files_uploaded.inc()
                    upload_size_bytes.observe(size)

                except Exception as e:
                    await db.rollback()
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Failed to upload {file.filename}: {str(e)}"
                    )

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
        if search:
            file_ids = await self._search_file_content(search, limit)
            if not file_ids:
                return []
            stmt = select(File).where(File.id.in_(file_ids))
        else:
            if not extension:
                stmt = select(File).where(File.owner_id == current_user["user_id"])  # Use user_id
            else:
                stmt = select(File)

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

        result = await db.execute(select(File).where(File.id == file_id))
        db_file = result.scalar_one_or_none()

        if not db_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        if str(db_file.owner_id) != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )

        try:
            content = await self._download_from_storage(db_file.file_path)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to read file"
            )

        filename = db_file.name
        quoted = urllib.parse.quote(filename)
        ascii_name = re.sub(r"[^\x00-\x7F]+", "_", filename)

        headers = {
            "Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{quoted}'
        }

        files_downloaded.inc()
        download_size_bytes.observe(len(content))

        return StreamingResponse(BytesIO(content), media_type=db_file.type, headers=headers)

    async def delete_file(
            self,
            file_id: str,
            db: AsyncSession,
            current_user: dict
    ) -> None:
        """Delete file from storage, database, and search index"""
        result = await db.execute(select(File).where(File.id == file_id))
        db_file = result.scalar_one_or_none()

        if not db_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        if str(db_file.owner_id) != current_user["user_id"]:
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED,
                detail="Not authorized"
            )

        try:
            backup = await self._download_from_storage(db_file.file_path)
            await self._delete_from_storage(db_file.file_path)
            await self._delete_from_search_index(db_file.id)
            await db.delete(db_file)
            await db.commit()

            files_deleted.inc()

        except Exception:
            await self._upload_to_storage(backup, db_file.file_path)
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete file"
            )


file_service = FileService()
