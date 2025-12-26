import os
from pathlib import Path
from google.cloud import storage
from core.settings import settings



class StorageService:
    def __init__(self):
        self.use_gcs = settings.USE_GCS == "true"
        if not self.use_gcs:
            self.local_dir = Path("uploads")
            self.local_dir.mkdir(exist_ok=True)

    async def generate_path(self, file_id: str, file_ext: str, user: dict):
        output = f"{user['sub']}/{file_id}{file_ext}"
        return output if settings.USE_GCS else self.local_dir / output

    async def upload(self, file_id: str, content: bytes, path: str):
        if self.use_gcs:
            gcs_client = storage.Client()
            bucket = gcs_client.bucket(settings.GCS_BUCKET_NAME)
            # Real GCS upload
            blob = bucket.blob(path)
            blob.upload_from_string(content)
        else:
            # Local storage
            file_path = self.local_dir / path
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_bytes(content)

    async def download(self, path: str) -> bytes:
        if self.use_gcs:
            gcs_client = storage.Client()
            bucket = gcs_client.bucket(settings.GCS_BUCKET_NAME)
            blob = bucket.blob(path)
            return blob.download_as_bytes()
        else:
            return (self.local_dir / path).read_bytes()

    async def delete(self, path: str) -> None:
        if self.use_gcs:
            gcs_client = storage.Client()
            bucket = gcs_client.bucket(settings.GCS_BUCKET_NAME)
            blob = bucket.blob(path)
            blob.delete()
        else:
            file_path = self.local_dir / path
            if file_path.exists():
                file_path.unlink()

# In settings
storage_service = StorageService()