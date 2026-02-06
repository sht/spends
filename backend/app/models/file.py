from sqlalchemy import Column, Integer, String, DateTime, BigInteger, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base
import uuid
from enum import Enum as PyEnum


class FileType(PyEnum):
    RECEIPT = "receipt"
    MANUAL = "manual"
    PHOTO = "photo"
    WARRANTY = "warranty"
    OTHER = "other"


class File(Base):
    __tablename__ = "files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purchase_id = Column(String, ForeignKey("purchases.id"), nullable=False)  # Changed to String to match Purchase.id

    # Original file information
    filename = Column(String, nullable=False)  # Original filename
    stored_filename = Column(String, nullable=False)  # Hash-based filename
    file_type = Column(Enum(FileType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)  # Category of file
    mime_type = Column(String, nullable=False)  # MIME type
    file_size = Column(BigInteger, nullable=False)  # Size in bytes

    # File integrity
    file_hash = Column(String, nullable=False)  # SHA-256 hash

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    purchase = relationship("Purchase", back_populates="files")

    def __repr__(self):
        return f"<File(id={self.id}, filename='{self.filename}', stored_filename='{self.stored_filename}')>"