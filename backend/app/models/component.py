from sqlalchemy import (
    Column,
    Integer,
    String,
    DECIMAL,
    Date,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from uuid import uuid4
from datetime import datetime


class Component(Base):
    __tablename__ = "components"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    purchase_id = Column(String, ForeignKey("purchases.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(DECIMAL(10, 2), nullable=True)
    currency_code = Column(String(3), default="USD")
    brand = Column(String(100), nullable=True)
    model_number = Column(String(100), nullable=True)
    serial_number = Column(String(100), nullable=True)
    quantity = Column(Integer, default=1)
    link = Column(String(500), nullable=True)
    warranty_expiry = Column(Date, nullable=True)
    warranty_type = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    tags = Column(String(255), nullable=True)
    created_at = Column(
        DateTime(timezone=True), default=datetime.now, server_default=func.now()
    )
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    purchase = relationship("Purchase", back_populates="components")
    files = relationship(
        "File", back_populates="component", cascade="all, delete-orphan"
    )
