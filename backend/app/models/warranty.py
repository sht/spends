from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from uuid import uuid4
from datetime import datetime
from enum import Enum as PyEnum


class WarrantyStatus(PyEnum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    VOIDED = "VOIDED"


class Warranty(Base):
    __tablename__ = "warranties"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    purchase_id = Column(String, ForeignKey("purchases.id"), unique=True, nullable=False)
    warranty_start = Column(DateTime, nullable=False)
    warranty_end = Column(DateTime, nullable=False)
    warranty_type = Column(String(50))  # LIMITED, EXTENDED, LIFETIME, etc.
    status = Column(Enum(WarrantyStatus), default=WarrantyStatus.ACTIVE)
    provider = Column(String(255), nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship
    purchase = relationship("Purchase", back_populates="warranty")