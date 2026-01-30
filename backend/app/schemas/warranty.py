from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from enum import Enum
from .common import BaseResponse


class WarrantyStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    VOIDED = "VOIDED"


class WarrantyBase(BaseModel):
    purchase_id: str
    warranty_start: date
    warranty_end: date
    warranty_type: Optional[str] = Field(None, max_length=50)
    status: Optional[WarrantyStatus] = WarrantyStatus.ACTIVE
    provider: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class WarrantyCreate(WarrantyBase):
    pass


class WarrantyUpdate(BaseModel):
    warranty_start: Optional[date] = None
    warranty_end: Optional[date] = None
    warranty_type: Optional[str] = Field(None, max_length=50)
    status: Optional[WarrantyStatus] = None
    provider: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class WarrantyResponse(WarrantyBase, BaseResponse):
    pass