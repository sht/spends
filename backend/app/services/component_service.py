from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.component import Component


async def get_components_by_purchase(
    db: AsyncSession, purchase_id: str
) -> List[Component]:
    result = await db.execute(
        select(Component)
        .where(Component.purchase_id == purchase_id)
        .order_by(Component.created_at.desc())
    )
    return result.scalars().all()


async def get_component(db: AsyncSession, component_id: str) -> Optional[Component]:
    result = await db.execute(select(Component).filter(Component.id == component_id))
    return result.scalar_one_or_none()


async def create_component(db: AsyncSession, component_data: dict) -> Component:
    db_component = Component(**component_data)
    db.add(db_component)
    await db.commit()
    await db.refresh(db_component)
    return db_component


async def update_component(
    db: AsyncSession, component_id: str, component_update: dict
) -> Optional[Component]:
    db_component = await get_component(db, component_id)
    if not db_component:
        return None

    for field, value in component_update.items():
        if value is not None:
            setattr(db_component, field, value)

    await db.commit()
    await db.refresh(db_component)
    return db_component


async def delete_component(db: AsyncSession, component_id: str) -> bool:
    db_component = await get_component(db, component_id)
    if not db_component:
        return False

    await db.delete(db_component)
    await db.commit()
    return True
