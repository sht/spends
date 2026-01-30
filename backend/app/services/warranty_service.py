from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.warranty import Warranty
from app.schemas.warranty import WarrantyCreate, WarrantyUpdate


async def get_warranty(db: AsyncSession, warranty_id: str) -> Optional[Warranty]:
    result = await db.execute(select(Warranty).filter(Warranty.id == warranty_id))
    return result.scalar_one_or_none()


async def get_warranties(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    expiring_soon: Optional[bool] = None
) -> tuple[List[Warranty], int]:
    query = select(Warranty)

    # Apply filters
    if status:
        query = query.filter(Warranty.status == status)
    if expiring_soon:
        # This would require additional logic to determine what "expiring soon" means
        # For now, we'll skip this filter
        pass

    # Get total count
    count_query = select(Warranty.id)
    if status:
        count_query = count_query.filter(Warranty.status == status)

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