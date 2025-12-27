import uuid
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from db.database import Base
from datetime import datetime


class File(Base):
    __tablename__ = "files"
    id = Column(String, primary_key=True)
    name = Column(String)
    type = Column(String)
    size = Column(Integer)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)  # Foreign key
    file_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    owner = relationship("User", back_populates="files")

