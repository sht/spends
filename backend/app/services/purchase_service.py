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
    retailer_id: Optional[str] = None,
    search: Optional[str] = None,
    tag: Optional[str] = None,
) -> tuple[List[Purchase], int]:
    query = (
        select(Purchase)
        .options(selectinload(Purchase.retailer))
        .options(selectinload(Purchase.brand))
        .options(selectinload(Purchase.warranty))
    )

    # Apply filters
    if retailer_id:
        query = query.filter(Purchase.retailer_id == retailer_id)
    if search:
        query = query.filter(Purchase.product_name.ilike(f"%{search}%"))
    if tag:
        query = query.filter(
            (Purchase.tags.ilike(f"%{tag}%")) | (Purchase.tags.is_(None))
        )

    # Get total count
    count_query = select(Purchase.id)
    if retailer_id:
        count_query = count_query.filter(Purchase.retailer_id == retailer_id)
    if search:
        count_query = count_query.filter(Purchase.product_name.ilike(f"%{search}%"))
    if tag:
        count_query = count_query.filter(
            (Purchase.tags.ilike(f"%{tag}%")) | (Purchase.tags.is_(None))
        )

    total_result = await db.execute(count_query)
    total = len(total_result.scalars().all())

    # Apply ordering (newest first) and pagination
    query = query.order_by(Purchase.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    purchases = result.scalars().all()

    return purchases, total


async def create_purchase(db: AsyncSession, purchase: PurchaseCreate) -> Purchase:
    # Extract warranty_expiry and warranty_type if provided
    warranty_expiry = purchase.warranty_expiry
    warranty_type = getattr(purchase, "warranty_type", None)

    # Create purchase without warranty_expiry and warranty_type (not Purchase columns)
    purchase_data = purchase.model_dump(exclude={"warranty_expiry", "warranty_type"})
    db_purchase = Purchase(**purchase_data)
    db.add(db_purchase)
    await db.commit()
    await db.refresh(db_purchase)

    # Create warranty if warranty_expiry is provided OR warranty_type is LIFETIME
    if warranty_expiry or warranty_type == "LIFETIME":
        from app.models.warranty import Warranty as WarrantyModel, WarrantyStatus

        today = date.today()

        # Handle lifetime warranty
        if warranty_type == "LIFETIME":
            db_warranty = WarrantyModel(
                purchase_id=db_purchase.id,
                warranty_start=db_purchase.purchase_date,
                warranty_end=date(9999, 12, 31),  # Far future date for lifetime
                warranty_type="LIFETIME",
                status=WarrantyStatus.ACTIVE,
                notes="Lifetime warranty",
            )
        else:
            is_active = warranty_expiry >= today
            db_warranty = WarrantyModel(
                purchase_id=db_purchase.id,
                warranty_start=db_purchase.purchase_date,
                warranty_end=warranty_expiry,
                warranty_type=warranty_type or "LIMITED",
                status=WarrantyStatus.ACTIVE if is_active else WarrantyStatus.EXPIRED,
                notes="Auto-created from purchase",
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


async def update_purchase(
    db: AsyncSession, purchase_id: str, purchase_update: PurchaseUpdate
) -> Optional[Purchase]:
    db_purchase = await get_purchase(db, purchase_id)
    if not db_purchase:
        return None

    # Check if warranty_expiry was explicitly provided (including None for clearing)
    update_dict = purchase_update.model_dump(exclude_unset=True)
    warranty_expiry_provided = "warranty_expiry" in update_dict
    warranty_expiry = update_dict.get("warranty_expiry")
    warranty_type = update_dict.get("warranty_type")

    # Update purchase fields (excluding warranty_expiry and warranty_type)
    update_data = {
        k: v
        for k, v in update_dict.items()
        if k not in ["warranty_expiry", "warranty_type"]
    }
    for field, value in update_data.items():
        setattr(db_purchase, field, value)

    await db.commit()
    await db.refresh(db_purchase)

    # Handle warranty update/create/delete only if warranty_expiry or warranty_type was provided
    if warranty_expiry_provided or warranty_type:
        from app.models.warranty import Warranty as WarrantyModel, WarrantyStatus

        # Handle lifetime warranty
        if warranty_type == "LIFETIME":
            if db_purchase.warranty:
                # Update existing warranty to lifetime
                db_purchase.warranty.warranty_end = date(9999, 12, 31)
                db_purchase.warranty.warranty_type = "LIFETIME"
                db_purchase.warranty.status = WarrantyStatus.ACTIVE
            else:
                # Create new lifetime warranty
                db_warranty = WarrantyModel(
                    purchase_id=db_purchase.id,
                    warranty_start=db_purchase.purchase_date,
                    warranty_end=date(9999, 12, 31),
                    warranty_type="LIFETIME",
                    status=WarrantyStatus.ACTIVE,
                    notes="Lifetime warranty",
                )
                db.add(db_warranty)
            await db.commit()
            await db.refresh(db_purchase)
        elif warranty_expiry is not None:
            # Set or update warranty
            # Convert date to datetime for comparison (use end of day for date comparison)
            today = date.today()
            is_active = warranty_expiry >= today

            if db_purchase.warranty:
                # Update existing warranty
                db_purchase.warranty.warranty_end = warranty_expiry
                db_purchase.warranty.warranty_type = warranty_type or "LIMITED"
                db_purchase.warranty.status = (
                    WarrantyStatus.ACTIVE if is_active else WarrantyStatus.EXPIRED
                )
            else:
                # Create new warranty
                db_warranty = WarrantyModel(
                    purchase_id=db_purchase.id,
                    warranty_start=db_purchase.purchase_date,
                    warranty_end=warranty_expiry,
                    warranty_type=warranty_type or "LIMITED",
                    status=WarrantyStatus.ACTIVE
                    if is_active
                    else WarrantyStatus.EXPIRED,
                    notes="Auto-created from purchase update",
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
