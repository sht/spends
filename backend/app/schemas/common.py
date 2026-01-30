from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from decimal import Decimal
from enum import Enum


class BaseResponse(BaseModel):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    limit: int
    pages: int