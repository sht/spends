from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from enum import Enum


class FileType(str, Enum):
    RECEIPT = "receipt"
    MANUAL = "manual"
    PHOTO = "photo"
    WARRANTY = "warranty"
    OTHER = "other"


class FileBase(BaseModel):
    filename: str
    stored_filename: str
    file_type: FileType
    mime_type: str
    file_size: int
    file_hash: str


class FileCreate(FileBase):
    purchase_id: str  # Using string to match Purchase.id format


class FileUpdate(BaseModel):
    file_type: Optional[FileType] = None


class FileResponse(FileBase):
    id: UUID
    purchase_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FileListResponse(BaseModel):
    items: List[FileResponse]
    total: int
    page: int
    limit: int
    pages: int