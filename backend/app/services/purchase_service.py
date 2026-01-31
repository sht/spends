from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime, date
from app.models.purchase import Purchase
from app.models.warranty import Warranty
from app.schemas.purchase import PurchaseCreate, PurchaseUpdate
from uuid import UUID


async def get_purchase(db: AsyncSession, purchase_id: str) -> Optional[Purchase]:
    result = await db.execute(
        select(Purchase)
        .options(selectinload(Purchase.retailer))
        .options(selectinload(Purchase.brand))
        .options(selectinload(Purchase.warranty))
        .filter(Purchase.id == purchase_id)
    )
    return result.scalar_one_or_none()


async def get_purchases(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    retailer_id: Optional[str] = None,
    search: Optional[str] = None
) -> tuple[List[Purchase], int]:
    query = select(Purchase).options(selectinload(Purchase.retailer)).options(selectinload(Purchase.brand)).options(selectinload(Purchase.warranty))

    # Apply filters
    if status:
        query = query.filter(Purchase.status == status)
    if retailer_id:
        query = query.filter(Purchase.retailer_id == retailer_id)
    if search:
        query = query.filter(Purchase.product_name.ilike(f"%{search}%"))

    # Get total count
    count_query = select(Purchase.id)
    if status:
        count_query = count_query.filter(Purchase.status == status)
    if retailer_id:
        count_query = count_query.filter(Purchase.retailer_id == retailer_id)
    if search:
        count_query = count_query.filter(Purchase.product_name.ilike(f"%{search}%"))

    total_result = await db.execute(count_query)
    total = len(total_result.scalars().all())

    # Apply pagination
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    purchases = result.scalars().all()

    return purchases, total


async def create_purchase(db: AsyncSession, purchase: PurchaseCreate) -> Purchase:
    # Extract warranty_expiry if provided
    warranty_expiry = purchase.warranty_expiry

    # Create purchase without warranty_expiry (it's not a Purchase column)
    purchase_data = purchase.model_dump(exclude={'warranty_expiry'})
    db_purchase = Purchase(**purchase_data)
    db.add(db_purchase)
    await db.commit()
    await db.refresh(db_purchase)

    # Create warranty if warranty_expiry is provided
    if warranty_expiry:
        from app.models.warranty import Warranty, WarrantyStatus
        today = date.today()
        is_active = warranty_expiry >= today
        db_warranty = Warranty(
            purchase_id=db_purchase.id,
            warranty_start=db_purchase.purchase_date,
            warranty_end=warranty_expiry,
            status=WarrantyStatus.ACTIVE if is_active else WarrantyStatus.EXPIRED,
            notes="Auto-created from purchase"
        )
        db.add(db_warranty)
        await db.commit()
        await db.refresh(db_warranty)

    # Return the purchase with relationships loaded to avoid lazy loading issues
    result = await db.execute(
        select(Purchase)
        .options(selectinload(Purchase.retailer))
        .options(selectinload(Purchase.brand))
        .options(selectinload(Purchase.warranty))
        .filter(Purchase.id == db_purchase.id)
    )
    return result.scalar_one_or_none()


async def update_purchase(db: AsyncSession, purchase_id: str, purchase_update: PurchaseUpdate) -> Optional[Purchase]:
    db_purchase = await get_purchase(db, purchase_id)
    if not db_purchase:
        return None

    # Check if warranty_expiry was explicitly provided (including None for clearing)
    update_dict = purchase_update.model_dump(exclude_unset=True)
    warranty_expiry_provided = 'warranty_expiry' in update_dict
    warranty_expiry = update_dict.get('warranty_expiry')
    
    # Update purchase fields (excluding warranty_expiry)
    update_data = {k: v for k, v in update_dict.items() if k != 'warranty_expiry'}
    for field, value in update_data.items():
        setattr(db_purchase, field, value)

    await db.commit()
    await db.refresh(db_purchase)
    
    # Handle warranty update/create/delete only if warranty_expiry was provided
    if warranty_expiry_provided:
        from app.models.warranty import Warranty, WarrantyStatus
        
        if warranty_expiry is not None:
            # Set or update warranty
            # Convert date to datetime for comparison (use end of day for date comparison)
            today = date.today()
            is_active = warranty_expiry >= today
            
            if db_purchase.warranty:
                # Update existing warranty
                db_purchase.warranty.warranty_end = warranty_expiry
                db_purchase.warranty.status = WarrantyStatus.ACTIVE if is_active else WarrantyStatus.EXPIRED
            else:
                # Create new warranty
                db_warranty = Warranty(
                    purchase_id=db_purchase.id,
                    warranty_start=db_purchase.purchase_date,
                    warranty_end=warranty_expiry,
                    status=WarrantyStatus.ACTIVE if is_active else WarrantyStatus.EXPIRED,
                    notes="Auto-created from purchase update"
                )
                db.add(db_warranty)
            
            await db.commit()
            await db.refresh(db_purchase)
        else:
            # Warranty was explicitly cleared (None) - delete existing warranty if present
            if db_purchase.warranty:
                await db.delete(db_purchase.warranty)
                await db.commit()
                await db.refresh(db_purchase)
    
    return db_purchase


async def delete_purchase(db: AsyncSession, purchase_id: str) -> bool:
    db_purchase = await get_purchase(db, purchase_id)
    if not db_purchase:
        return False

    await db.delete(db_purchase)
    await db.commit()
    return True