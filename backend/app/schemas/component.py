from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date
from decimal import Decimal


class ComponentBase(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    name: str = Field(..., min_length=1, max_length=255)
    purchase_id: str
    description: Optional[str] = None
    price: Optional[Decimal] = Field(default=None, ge=0)
    currency_code: Optional[str] = Field(default="USD", max_length=3)
    brand: Optional[str] = Field(default=None, max_length=100)
    model_number: Optional[str] = Field(default=None, max_length=100)
    serial_number: Optional[str] = Field(default=None, max_length=100)
    quantity: Optional[int] = Field(default=1, ge=0)
    link: Optional[str] = Field(default=None, max_length=500)
    warranty_expiry: Optional[date] = None
    warranty_type: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = None
    tags: Optional[str] = Field(default=None, max_length=255)


class ComponentCreate(ComponentBase):
    pass


class ComponentUpdate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    price: Optional[Decimal] = Field(None, ge=0)
    currency_code: Optional[str] = Field(None, max_length=3)
    brand: Optional[str] = Field(None, max_length=100)
    model_number: Optional[str] = Field(None, max_length=100)
    serial_number: Optional[str] = Field(None, max_length=100)
    quantity: Optional[int] = Field(None, ge=0)
    link: Optional[str] = Field(None, max_length=500)
    warranty_expiry: Optional[date] = None
    warranty_type: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    tags: Optional[str] = Field(None, max_length=255)


class ComponentResponse(ComponentBase):
    id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
