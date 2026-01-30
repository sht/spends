from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.retailer import Retailer
from app.models.brand import Brand
from app.schemas.retailer import RetailerCreate, RetailerUpdate


async def get_retailer(db: AsyncSession, retailer_id: str) -> Optional[Retailer]:
    result = await db.execute(select(Retailer).filter(Retailer.id == retailer_id))
    return result.scalar_one_or_none()


async def get_retailers(db: AsyncSession, skip: int = 0, limit: int = 20) -> tuple[List[Retailer], int]:
    query = select(Retailer).offset(skip).limit(limit)
    result = await db.execute(query)
    retailers = result.scalars().all()

    # Get total count
    count_query = select(Retailer.id)
    total_result = await db.execute(count_query)
    total = len(total_result.scalars().all())

    return retailers, total


async def get_retailers_with_brand_status(db: AsyncSession, skip: int = 0, limit: int = 20) -> tuple[List[dict], int]:
    """Get retailers with isBrand flag indicating if retailer is also a brand."""
    # Get all retailers
    query = select(Retailer).offset(skip).limit(limit)
    result = await db.execute(query)
    retailers = result.scalars().all()

    # Get all brand names for quick lookup
    brand_result = await db.execute(select(Brand.name))
    brand_names = {name for name in brand_result.scalars().all()}

    # Build response with isBrand flag
    retailers_with_status = []
    for retailer in retailers:
        retailers_with_status.append({
            "id": retailer.id,
            "name": retailer.name,
            "url": retailer.url,
            "created_at": retailer.created_at,
            "is_brand": retailer.name in brand_names
        })

    # Get total count
    count_query = select(Retailer.id)
    total_result = await db.execute(count_query)
    total = len(total_result.scalars().all())

    return retailers_with_status, total


async def create_retailer(db: AsyncSession, retailer: RetailerCreate) -> Retailer:
    db_retailer = Retailer(**retailer.model_dump())
    db.add(db_retailer)
    await db.commit()
    await db.refresh(db_retailer)
    return db_retailer


async def update_retailer(db: AsyncSession, retailer_id: str, retailer_update: RetailerUpdate) -> Optional[Retailer]:
    db_retailer = await get_retailer(db, retailer_id)
    if not db_retailer:
        return None

    update_data = retailer_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_retailer, field, value)

    await db.commit()
    await db.refresh(db_retailer)
    return db_retailer


async def delete_retailer(db: AsyncSession, retailer_id: str) -> bool:
    db_retailer = await get_retailer(db, retailer_id)
    if not db_retailer:
        return False

    await db.delete(db_retailer)
    await db.commit()
    return True
