from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from datetime import datetime, date
from app.models.purchase import Purchase
from app.models.warranty import Warranty
from app.schemas.purchase import PurchaseCreate, PurchaseUpdate
from uuid import UUID


SORT_FIELD_MAP = {
    "name": Purchase.product_name,
    "price": Purchase.price,
    "purchaseDate": Purchase.purchase_date,
    "retailer": Purchase.retailer_id,
    "modelNumber": Purchase.model_number,
    "quantity": Purchase.quantity,
    "serialNumber": Purchase.serial_number,
    "retailerOrderNumber": Purchase.retailer_order_number,
    "taxDeductible": Purchase.tax_deductible,
    "tags": Purchase.tags,
    "notes": Purchase.notes,
}


def _apply_filters(query, retailer_id, search, tag, date_from, date_to):
    if retailer_id:
        query = query.where(Purchase.retailer_id == retailer_id)
    if search:
        query = query.where(Purchase.product_name.ilike(f"%{search}%"))
    if tag:
        query = query.where(Purchase.tags.ilike(f"%{tag}%"))
    if date_from:
        query = query.where(Purchase.purchase_date >= date.fromisoformat(date_from))
    if date_to:
        query = query.where(Purchase.purchase_date <= date.fromisoformat(date_to))
    return query


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
    sort_by: Optional[str] = None,
    sort_direction: Optional[str] = "desc",
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> tuple[List[Purchase], int, float]:
    query = (
        select(Purchase)
        .options(selectinload(Purchase.retailer))
        .options(selectinload(Purchase.brand))
        .options(selectinload(Purchase.warranty))
        .options(selectinload(Purchase.files))
    )

    # Apply filters to main query
    query = _apply_filters(query, retailer_id, search, tag, date_from, date_to)

    # Get total count and total spending in one query
    stats_query = select(
        func.count(Purchase.id),
        func.coalesce(func.sum(Purchase.price), 0),
    ).select_from(Purchase)
    stats_query = _apply_filters(stats_query, retailer_id, search, tag, date_from, date_to)
    stats_result = await db.execute(stats_query)
    row = stats_result.one()
    total = row[0]
    total_spending = float(row[1])

    # Apply sorting
    sort_column = SORT_FIELD_MAP.get(sort_by, Purchase.created_at)
    if sort_direction == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Apply pagination
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    purchases = result.scalars().all()

    return purchases, total, total_spending


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
