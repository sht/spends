from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from .common import BaseResponse


class RetailerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    url: Optional[str] = Field(None, max_length=255)


class RetailerCreate(RetailerBase):
    pass


class RetailerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    url: Optional[str] = Field(None, max_length=255)


class RetailerResponse(RetailerBase, BaseResponse):
    is_brand: bool = False


class RetailerWithBrandStatus(BaseModel):
    """Schema for retailer with is_brand flag."""
    id: str
    name: str
    url: Optional[str] = None
    created_at: Optional[datetime] = None
    is_brand: bool = False
