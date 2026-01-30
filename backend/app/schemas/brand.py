from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from .common import BaseResponse


class BrandBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    url: Optional[str] = Field(None, max_length=255)


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    url: Optional[str] = Field(None, max_length=255)


class BrandResponse(BrandBase, BaseResponse):
    pass