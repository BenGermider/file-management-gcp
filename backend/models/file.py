import uuid
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from db.database import Base
from datetime import datetime


class File(Base):
    __tablename__ = "files"
    id = Column(String, primary_key=True)
    name = Column(String)
    type = Column(String)
    size = Column(Integer)
    owner = Column(String)
    file_path = Column(String)  # Path in Google Cloud Storage
    created_at = Column(DateTime, default=datetime.utcnow)

