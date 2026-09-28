from typing import List, Optional
from datetime import date, timedelta
from sqlalchemy import and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.warranty import Warranty, WarrantyStatus
from app.schemas.warranty import WarrantyCreate, WarrantyUpdate


def not_voided():
    return or_(Warranty.status.is_(None), Warranty.status != WarrantyStatus.VOIDED)


def status_condition(status: str):
    """SQL filter matching current_warranty_status(): ACTIVE/EXPIRED come from warranty_end."""
    today = date.today()
    if status == WarrantyStatus.ACTIVE.value:
        return and_(not_voided(), Warranty.warranty_end >= today)
    if status == WarrantyStatus.EXPIRED.value:
        return and_(not_voided(), Warranty.warranty_end < today)
    return Warranty.status == status


async def get_expiring_warranties(db: AsyncSession, days: int) -> List[Warranty]:
    today = date.today()
    result = await db.execute(
        select(Warranty)
        .filter(not_voided(), Warranty.warranty_end >= today, Warranty.warranty_end <= today + timedelta(days=days))
        .order_by(Warranty.warranty_end)
    )
    return result.scalars().all()


async def get_warranty(db: AsyncSession, warranty_id: str) -> Optional[Warranty]:
    result = await db.execute(select(Warranty).filter(Warranty.id == warranty_id))
    return result.scalar_one_or_none()


async def get_warranties(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None
) -> tuple[List[Warranty], int]:
    query = select(Warranty)

    # Apply filters
    if status:
        query = query.filter(status_condition(status))

    # Get total count
    count_query = select(Warranty.id)
    if status:
        count_query = count_query.filter(status_condition(status))

    total_result = await db.execute(count_query)
    total = len(total_result.scalars().all())

    # Apply pagination
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    warranties = result.scalars().all()

    return warranties, total


async def create_warranty(db: AsyncSession, warranty: WarrantyCreate) -> Warranty:
    db_warranty = Warranty(**warranty.model_dump())
    db.add(db_warranty)
    await db.commit()
    await db.refresh(db_warranty)
    return db_warranty


async def update_warranty(db: AsyncSession, warranty_id: str, warranty_update: WarrantyUpdate) -> Optional[Warranty]:
    db_warranty = await get_warranty(db, warranty_id)
    if not db_warranty:
        return None

    update_data = warranty_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_warranty, field, value)

    await db.commit()
    await db.refresh(db_warranty)
    return db_warranty


async def delete_warranty(db: AsyncSession, warranty_id: str) -> bool:
    db_warranty = await get_warranty(db, warranty_id)
    if not db_warranty:
        return False

    await db.delete(db_warranty)
    await db.commit()
    return True