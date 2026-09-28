from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from uuid import uuid4
from datetime import datetime, date
from enum import Enum as PyEnum


class WarrantyStatus(PyEnum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    VOIDED = "VOIDED"


def current_warranty_status(status, warranty_end) -> str:
    """ACTIVE/EXPIRED is derived from warranty_end, only VOIDED is taken from the stored status."""
    value = status.value if isinstance(status, PyEnum) else status
    if value == WarrantyStatus.VOIDED.value:
        return value
    if isinstance(warranty_end, datetime):
        warranty_end = warranty_end.date()
    if isinstance(warranty_end, date):
        return WarrantyStatus.ACTIVE.value if warranty_end >= date.today() else WarrantyStatus.EXPIRED.value
    return value


class Warranty(Base):
    __tablename__ = "warranties"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    purchase_id = Column(String, ForeignKey("purchases.id"), unique=True, nullable=False)
    warranty_start = Column(Date, nullable=False)
    warranty_end = Column(Date, nullable=False)
    warranty_type = Column(String(50))  # LIMITED, EXTENDED, LIFETIME, etc.
    status = Column(Enum(WarrantyStatus), default=WarrantyStatus.ACTIVE)
    provider = Column(String(255), nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship
    purchase = relationship("Purchase", back_populates="warranty")