from sqlalchemy import Column, Integer, String, DECIMAL, Date, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from uuid import uuid4
from datetime import datetime


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    product_name = Column(String(255), nullable=False)
    price = Column(DECIMAL(10, 2), nullable=False)  # Using DECIMAL for money
    currency_code = Column(String(3), default="USD")
    retailer_id = Column(String, ForeignKey("retailers.id"))
    brand_id = Column(String, ForeignKey("brands.id"))
    purchase_date = Column(Date, nullable=False)
    notes = Column(String, nullable=True)
    tax_deductible = Column(Integer, default=0)  # 0 = false, 1 = true
    model_number = Column(String(100), nullable=True)
    serial_number = Column(String(100), nullable=True)
    retailer_order_number = Column(String(100), nullable=True)
    quantity = Column(Integer, default=1)
    link = Column(String(500), nullable=True)
    return_deadline = Column(Date, nullable=True)
    return_policy = Column(String(200), nullable=True)
    tags = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    retailer = relationship("Retailer", back_populates="purchases")
    brand = relationship("Brand", back_populates="purchases")
    warranty = relationship("Warranty", back_populates="purchase", uselist=False, cascade="all, delete-orphan")
    files = relationship("File", back_populates="purchase", cascade="all, delete-orphan")
