from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from .common import BaseResponse


class PurchaseBase(BaseModel):
    product_name: str = Field(..., min_length=1, max_length=255)
    price: Decimal = Field(..., gt=0)
    currency_code: Optional[str] = Field(default="USD", max_length=3)
    retailer_id: Optional[str] = None
    brand_id: Optional[str] = None
    purchase_date: date
    notes: Optional[str] = None
    tax_deductible: Optional[int] = Field(default=0, ge=0, le=1)
    warranty_expiry: Optional[date] = None
    model_number: Optional[str] = Field(default=None, max_length=100)
    serial_number: Optional[str] = Field(default=None, max_length=100)
    retailer_order_number: Optional[str] = Field(default=None, max_length=100)
    quantity: Optional[int] = Field(default=1, ge=1)
    link: Optional[str] = Field(default=None, max_length=500)
    return_deadline: Optional[date] = None
    return_policy: Optional[str] = Field(default=None, max_length=200)
    tags: Optional[str] = Field(default=None, max_length=255)


class PurchaseCreate(PurchaseBase):
    @field_validator('purchase_date')
    @classmethod
    def validate_purchase_date_not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError('Purchase date cannot be in the future')
        return v


class PurchaseUpdate(BaseModel):
    product_name: Optional[str] = Field(None, min_length=1, max_length=255)
    price: Optional[Decimal] = Field(None, gt=0)
    currency_code: Optional[str] = Field(None, max_length=3)
    retailer_id: Optional[str] = None
    brand_id: Optional[str] = None
    purchase_date: Optional[date] = None
    notes: Optional[str] = None
    tax_deductible: Optional[int] = Field(None, ge=0, le=1)
    warranty_expiry: Optional[date] = None
    model_number: Optional[str] = Field(None, max_length=100)
    serial_number: Optional[str] = Field(None, max_length=100)
    retailer_order_number: Optional[str] = Field(None, max_length=100)
    quantity: Optional[int] = Field(None, ge=1)
    link: Optional[str] = Field(None, max_length=500)
    return_deadline: Optional[date] = None
    return_policy: Optional[str] = Field(None, max_length=200)
    tags: Optional[str] = Field(None, max_length=255)


class RetailerInfo(BaseModel):
    id: str
    name: str
    
    class Config:
        from_attributes = True


class BrandInfo(BaseModel):
    id: str
    name: str
    
    class Config:
        from_attributes = True


class WarrantyInfo(BaseModel):
    id: str
    warranty_start: date
    warranty_end: date
    warranty_type: Optional[str] = None
    status: Optional[str] = None
    provider: Optional[str] = None
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True


class PurchaseResponse(PurchaseBase, BaseResponse):
    warranty_id: Optional[str] = None
    retailer: Optional[RetailerInfo] = None
    brand: Optional[BrandInfo] = None
    warranty: Optional[WarrantyInfo] = None