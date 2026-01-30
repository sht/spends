from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.brand import Brand
from app.schemas.brand import BrandCreate, BrandUpdate


async def get_brand(db: AsyncSession, brand_id: str) -> Optional[Brand]:
    result = await db.execute(select(Brand).filter(Brand.id == brand_id))
    return result.scalar_one_or_none()


async def get_brands(db: AsyncSession, skip: int = 0, limit: int = 20) -> tuple[List[Brand], int]:
    query = select(Brand).offset(skip).limit(limit)
    result = await db.execute(query)
    brands = result.scalars().all()

    # Get total count
    count_query = select(Brand.id)
    total_result = await db.execute(count_query)
    total = len(total_result.scalars().all())

    return brands, total


async def create_brand(db: AsyncSession, brand: BrandCreate) -> Brand:
    db_brand = Brand(**brand.model_dump())
    db.add(db_brand)
    await db.commit()
    await db.refresh(db_brand)
    return db_brand


async def update_brand(db: AsyncSession, brand_id: str, brand_update: BrandUpdate) -> Optional[Brand]:
    db_brand = await get_brand(db, brand_id)
    if not db_brand:
        return None

    update_data = brand_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_brand, field, value)

    await db.commit()
    await db.refresh(db_brand)
    return db_brand


async def delete_brand(db: AsyncSession, brand_id: str) -> bool:
    db_brand = await get_brand(db, brand_id)
    if not db_brand:
        return False

    await db.delete(db_brand)
    await db.commit()
    return True