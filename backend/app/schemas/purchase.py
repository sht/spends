from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from enum import Enum
from .common import BaseResponse


class PurchaseStatus(str, Enum):
    ORDERED = "ORDERED"
    RECEIVED = "RECEIVED"


class PurchaseBase(BaseModel):
    product_name: str = Field(..., min_length=1, max_length=255)
    price: Decimal = Field(..., gt=0, max_digits=10, decimal_places=2)
    currency_code: Optional[str] = Field(default="USD", max_length=3)
    retailer_id: Optional[str] = None
    brand_id: Optional[str] = None
    status: Optional[PurchaseStatus] = PurchaseStatus.RECEIVED
    purchase_date: datetime
    notes: Optional[str] = None


class PurchaseCreate(PurchaseBase):
    pass


class PurchaseUpdate(BaseModel):
    product_name: Optional[str] = Field(None, min_length=1, max_length=255)
    price: Optional[Decimal] = Field(None, gt=0, max_digits=10, decimal_places=2)
    currency_code: Optional[str] = Field(None, max_length=3)
    retailer_id: Optional[str] = None
    brand_id: Optional[str] = None
    status: Optional[PurchaseStatus] = None
    purchase_date: Optional[datetime] = None
    notes: Optional[str] = None


class PurchaseResponse(PurchaseBase, BaseResponse):
    warranty_id: Optional[str] = None