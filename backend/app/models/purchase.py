from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from uuid import uuid4
from datetime import datetime
from enum import Enum as PyEnum


class PurchaseStatus(PyEnum):
    ORDERED = "ORDERED"
    RECEIVED = "RECEIVED"


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    product_name = Column(String(255), nullable=False)
    price = Column(DECIMAL(10, 2), nullable=False)  # Using DECIMAL for money
    currency_code = Column(String(3), default="USD")
    retailer_id = Column(String, ForeignKey("retailers.id"))
    brand_id = Column(String, ForeignKey("brands.id"))
    status = Column(Enum(PurchaseStatus), default=PurchaseStatus.RECEIVED)
    purchase_date = Column(DateTime, nullable=False)
    notes = Column(String, nullable=True)
    tax_deductible = Column(Integer, default=0)  # 0 = false, 1 = true
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    retailer = relationship("Retailer", back_populates="purchases")
    brand = relationship("Brand", back_populates="purchases")
    warranty = relationship("Warranty", back_populates="purchase", uselist=False, cascade="all, delete-orphan")