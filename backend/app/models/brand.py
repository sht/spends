from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from uuid import uuid4


class Brand(Base):
    __tablename__ = "brands"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(255), unique=True, nullable=False)
    url = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    purchases = relationship("Purchase", back_populates="brand")