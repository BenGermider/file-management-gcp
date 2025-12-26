from pydantic import BaseModel
from datetime import datetime


class FileResponse(BaseModel):
    id: str
    name: str
    type: str
    size: int
    created_at: datetime

    class Config:
        from_attributes = True