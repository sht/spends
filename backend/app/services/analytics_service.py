from typing import List, Dict, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, extract, and_, Float
from datetime import datetime, timedelta, date
from decimal import Decimal
from app.models.purchase import Purchase
from app.models.warranty import Warranty
from app.models.retailer import Retailer
from app.models.brand import Brand
from sqlalchemy.future import select
from app.schemas.analytics import (
    SpendingByMonth, SpendingAnalytics,
    WarrantyTimelineItem, WarrantyAnalytics,
    DistributionItem, DistributionAnalytics,
    TopProduct, TopProductsAnalytics,
    ExpensivePurchase, ExpensivePurchasesAnalytics,
    SummaryAnalytics
)


async def get_spending_by_month(db: AsyncSession, months: int = None) -> List[SpendingByMonth]:
    """
    Get total spending grouped by month. If months is None, returns all data.
    """
    # Query to get spending grouped by month
    stmt = (
        select(
            func.strftime('%Y-%m', Purchase.purchase_date).label('month'),
            func.sum(Purchase.price).label('total_amount'),
            func.count(Purchase.id).label('item_count')
        )
        .group_by(func.strftime('%Y-%m', Purchase.purchase_date))
        .order_by(func.strftime('%Y-%m', Purchase.purchase_date))
    )
    
    # Only apply date filter if months is specified
    if months is not None:
        today = date.today()
        start_date = today - timedelta(days=months * 30)
        stmt = stmt.where(Purchase.purchase_date >= start_date)
    
    result = await db.execute(stmt)
    rows = result.all()
    
    spending_data = []
    for row in rows:
        # Format month from "2024-06" to "Jun 2024"
        month_str = row.month
        try:
            month_date = datetime.strptime(month_str, '%Y-%m')
            formatted_month = month_date.strftime('%b %Y')  # e.g., "Jun 2024"
        except (ValueError, TypeError):
            formatted_month = month_str  # Fallback to original if parsing fails
        
        spending_data.append(SpendingByMonth(
            month=formatted_month,
            total_amount=row.total_amount or Decimal('0.00'),
            item_count=row.item_count or 0
        ))
    
    return spending_data


async def get_warranty_timeline(db: AsyncSession, months: int = None) -> List[WarrantyTimelineItem]:
    """
    Get warranty timeline showing active, expired, and expiring soon warranties.
    If months is None, returns all data.
    """
    today = date.today()

    # For SQLite, we need to use a different approach since it doesn't have advanced date functions
    # We'll create a simplified version that groups warranties by their status
    stmt = select(Warranty)
    result = await db.execute(stmt)
    warranties = result.scalars().all()

    # Group warranties by month based on their end date
    monthly_data: Dict[str, Dict[str, int]] = {}

    for warranty in warranties:
        # Handle potential null values for warranty_end
        if not warranty.warranty_end:
            continue

        # Ensure warranty_end is a date object, not datetime or other format
        try:
            if isinstance(warranty.warranty_end, datetime):
                warranty_end_date = warranty.warranty_end.date()
            elif isinstance(warranty.warranty_end, date):
                warranty_end_date = warranty.warranty_end
            else:
                # If it's a string or other format, try to parse it
                if isinstance(warranty.warranty_end, str):
                    # Parse the string date
                    if ' ' in warranty.warranty_end:  # Contains time part
                        parsed_date = datetime.fromisoformat(warranty.warranty_end.replace(' ', 'T'))
                        warranty_end_date = parsed_date.date()
                    else:
                        warranty_end_date = date.fromisoformat(warranty.warranty_end)
                else:
                    continue  # Skip if we can't process the date
        except (ValueError, TypeError, AttributeError):
            continue  # Skip if we can't process the date

        month_key = warranty_end_date.strftime('%Y-%m')
        if month_key not in monthly_data:
            monthly_data[month_key] = {'active': 0, 'expired': 0}

        # Determine status for this warranty
        if warranty.status.value == 'EXPIRED':
            monthly_data[month_key]['expired'] += 1
        elif warranty.status.value == 'ACTIVE':
            monthly_data[month_key]['active'] += 1
        elif warranty.status.value == 'VOIDED':
            # Voided warranties are neither active nor expired in the traditional sense
            pass

    # Convert to WarrantyTimelineItem objects with formatted month names
    timeline_items = []
    for month, counts in monthly_data.items():
        # Format month from "2024-06" to "Jun 2024"
        try:
            month_date = datetime.strptime(month, '%Y-%m')
            formatted_month = month_date.strftime('%b %Y')  # e.g., "Jun 2024"
        except (ValueError, TypeError):
            formatted_month = month  # Fallback to original if parsing fails

        timeline_items.append(WarrantyTimelineItem(
            month=formatted_month,
            active=counts['active'],
            expired=counts['expired']
        ))

    # Sort by month (convert back to sortable format for sorting)
    try:
        timeline_items.sort(key=lambda x: datetime.strptime(x.month, '%b %Y') if x.month else datetime.min)
    except ValueError:
        # If month format is unexpected, sort as strings
        timeline_items.sort(key=lambda x: x.month)

    return timeline_items


async def get_retailer_distribution(db: AsyncSession) -> List[DistributionItem]:
    """
    Get purchase distribution by retailer
    """
    stmt = (
        select(
            Retailer.name.label('retailer_name'),
            func.count(Purchase.id).label('count'),
            func.sum(Purchase.price).label('total_spent')
        )
        .join(Purchase, Purchase.retailer_id == Retailer.id, isouter=True)
        .group_by(Retailer.id, Retailer.name)
        .order_by(func.count(Purchase.id).desc())
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    total_items = sum(row.count for row in rows)
    total_spent = sum(row.total_spent or 0 for row in rows)
    
    distribution_items = []
    for row in rows:
        percentage = (row.count / total_items * 100) if total_items > 0 else 0
        distribution_items.append(DistributionItem(
            name=row.retailer_name,
            count=row.count,
            percentage=round(percentage, 2),
            total_spent=row.total_spent or Decimal('0.00')
        ))
    
    return distribution_items


async def get_brand_distribution(db: AsyncSession) -> List[DistributionItem]:
    """
    Get purchase distribution by brand
    """
    stmt = (
        select(
            Brand.name.label('brand_name'),
            func.count(Purchase.id).label('count'),
            func.sum(Purchase.price).label('total_spent')
        )
        .join(Purchase, Purchase.brand_id == Brand.id, isouter=True)
        .group_by(Brand.id, Brand.name)
        .order_by(func.count(Purchase.id).desc())
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    total_items = sum(row.count for row in rows)
    total_spent = sum(row.total_spent or 0 for row in rows)
    
    distribution_items = []
    for row in rows:
        percentage = (row.count / total_items * 100) if total_items > 0 else 0
        distribution_items.append(DistributionItem(
            name=row.brand_name,
            count=row.count,
            percentage=round(percentage, 2),
            total_spent=row.total_spent or Decimal('0.00')
        ))
    
    return distribution_items


async def get_top_products(db: AsyncSession, limit: int = 10, sort_by: str = 'price') -> List[TopProduct]:
    """
    Get top products by price (most expensive) or by purchase count
    """
    # Fetch all products with aggregation
    stmt = (
        select(
            Purchase.product_name,
            func.count(Purchase.id).label('count'),
            func.sum(Purchase.price).label('total_spent'),
            func.avg(Purchase.price).label('avg_price')
        )
        .group_by(Purchase.product_name)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    # Sort in Python to ensure proper numeric sorting
    if sort_by == 'price':
        # Sort by average price descending (most expensive first)
        rows = sorted(rows, key=lambda x: float(x.avg_price or 0), reverse=True)[:limit]
    else:
        # Sort by count descending
        rows = sorted(rows, key=lambda x: x.count, reverse=True)[:limit]
    
    top_products = []
    for row in rows:
        top_products.append(TopProduct(
            product_name=row.product_name,
            count=row.count,
            total_spent=row.total_spent or Decimal('0.00'),
            avg_price=row.avg_price or Decimal('0.00')
        ))
    
    return top_products


async def get_expensive_purchases(db: AsyncSession, limit: int = 10) -> List[ExpensivePurchase]:
    """
    Get most expensive individual purchases with brand and date
    """
    from app.schemas.analytics import ExpensivePurchase
    
    stmt = (
        select(
            Purchase.id,
            Purchase.product_name,
            Brand.name.label('brand_name'),
            Purchase.price,
            Purchase.purchase_date
        )
        .join(Brand, Purchase.brand_id == Brand.id, isouter=True)
        .order_by(Purchase.price.desc())
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    expensive_purchases = []
    for row in rows:
        expensive_purchases.append(ExpensivePurchase(
            id=str(row.id),
            product_name=row.product_name,
            brand_name=row.brand_name,
            price=row.price or Decimal('0.00'),
            purchase_date=row.purchase_date.isoformat() if row.purchase_date else None
        ))
    
    return expensive_purchases


async def get_spending_summary(db: AsyncSession) -> SummaryAnalytics:
    """
    Get overall spending summary
    """
    # Total spent
    total_spent_stmt = select(func.sum(Purchase.price)).select_from(Purchase)
    total_spent_result = await db.execute(total_spent_stmt)
    total_spent = total_spent_result.scalar() or Decimal('0.00')
    
    # Average price
    avg_price_stmt = select(func.avg(Purchase.price)).select_from(Purchase)
    avg_price_result = await db.execute(avg_price_stmt)
    avg_price = avg_price_result.scalar() or Decimal('0.00')
    
    # Total items
    total_items_stmt = select(func.count(Purchase.id)).select_from(Purchase)
    total_items_result = await db.execute(total_items_stmt)
    total_items = total_items_result.scalar() or 0
    
    # Active warranties
    active_warranties_stmt = select(func.count(Warranty.id)).where(Warranty.status == 'ACTIVE')
    active_warranties_result = await db.execute(active_warranties_stmt)
    active_warranties = active_warranties_result.scalar() or 0

    # Expiring warranties (within 30 days)
    today = date.today()
    thirty_days_later = today + timedelta(days=30)
    expiring_warranties_stmt = select(func.count(Warranty.id)).where(
        and_(
            Warranty.status == 'ACTIVE',
            Warranty.warranty_end <= thirty_days_later,
            Warranty.warranty_end >= today
        )
    )
    expiring_warranties_result = await db.execute(expiring_warranties_stmt)
    expiring_warranties = expiring_warranties_result.scalar() or 0
    
    # Expired warranties
    expired_warranties_stmt = select(func.count(Warranty.id)).where(Warranty.status == 'EXPIRED')
    expired_warranties_result = await db.execute(expired_warranties_stmt)
    expired_warranties = expired_warranties_result.scalar() or 0
    
    # Tax deductible items (tax_deductible is an Integer: 0 = false, 1 = true)
    tax_deductible_stmt = select(func.count(Purchase.id)).where(Purchase.tax_deductible == 1)
    tax_deductible_result = await db.execute(tax_deductible_stmt)
    tax_deductible_count = tax_deductible_result.scalar() or 0
    
    return SummaryAnalytics(
        total_spent=total_spent,
        avg_price=avg_price,
        total_items=total_items,
        active_warranties=active_warranties,
        expiring_warranties=expiring_warranties,
        expired_warranties=expired_warranties,
        tax_deductible_count=tax_deductible_count
    )


async def get_recent_purchases(db: AsyncSession, limit: int = 10) -> List:
    """
    Get recent purchases
    """
    try:
        stmt = (
            select(Purchase)
            .order_by(Purchase.created_at.desc())
            .limit(limit)
        )

        result = await db.execute(stmt)
        purchases = result.scalars().all()

        # Ensure all date fields are properly handled for serialization
        for purchase in purchases:
            # Process purchase_date
            if hasattr(purchase, 'purchase_date') and purchase.purchase_date:
                try:
                    if isinstance(purchase.purchase_date, datetime):
                        purchase.purchase_date = purchase.purchase_date.date()
                    elif isinstance(purchase.purchase_date, str):
                        # Parse string date
                        if ' ' in purchase.purchase_date:  # Contains time part
                            parsed_date = datetime.fromisoformat(purchase.purchase_date.replace(' ', 'T'))
                            purchase.purchase_date = parsed_date.date()
                        else:
                            purchase.purchase_date = date.fromisoformat(purchase.purchase_date)
                except (ValueError, TypeError, AttributeError):
                    # If we can't process the date, leave it as is or set to None
                    # Don't raise an exception, just continue
                    pass

            # Process return_deadline
            if hasattr(purchase, 'return_deadline') and purchase.return_deadline:
                try:
                    if isinstance(purchase.return_deadline, datetime):
                        purchase.return_deadline = purchase.return_deadline.date()
                    elif isinstance(purchase.return_deadline, str):
                        # Parse string date
                        if ' ' in purchase.return_deadline:  # Contains time part
                            parsed_date = datetime.fromisoformat(purchase.return_deadline.replace(' ', 'T'))
                            purchase.return_deadline = parsed_date.date()
                        else:
                            purchase.return_deadline = date.fromisoformat(purchase.return_deadline)
                except (ValueError, TypeError, AttributeError):
                    # If we can't process the date, leave it as is or set to None
                    # Don't raise an exception, just continue
                    pass

        return purchases
    except Exception as e:
        # Log the error but return an empty list instead of raising an exception
        # This prevents the frontend from receiving an error and falling back to mock data
        print(f"Error in get_recent_purchases: {e}")
        return []


async def get_recent_warranties(db: AsyncSession, limit: int = 10) -> List:
    """
    Get recent warranties
    """
    try:
        stmt = (
            select(Warranty)
            .order_by(Warranty.created_at.desc())
            .limit(limit)
        )

        result = await db.execute(stmt)
        warranties = result.scalars().all()

        # Ensure all date fields are properly handled for serialization
        for warranty in warranties:
            # Process warranty_start
            if hasattr(warranty, 'warranty_start') and warranty.warranty_start:
                try:
                    if isinstance(warranty.warranty_start, datetime):
                        warranty.warranty_start = warranty.warranty_start.date()
                    elif isinstance(warranty.warranty_start, str):
                        # Parse string date
                        if ' ' in warranty.warranty_start:  # Contains time part
                            parsed_date = datetime.fromisoformat(warranty.warranty_start.replace(' ', 'T'))
                            warranty.warranty_start = parsed_date.date()
                        else:
                            warranty.warranty_start = date.fromisoformat(warranty.warranty_start)
                except (ValueError, TypeError, AttributeError):
                    # If we can't process the date, leave it as is or set to None
                    # Don't raise an exception, just continue
                    pass

            # Process warranty_end
            if hasattr(warranty, 'warranty_end') and warranty.warranty_end:
                try:
                    if isinstance(warranty.warranty_end, datetime):
                        warranty.warranty_end = warranty.warranty_end.date()
                    elif isinstance(warranty.warranty_end, str):
                        # Parse string date
                        if ' ' in warranty.warranty_end:  # Contains time part
                            parsed_date = datetime.fromisoformat(warranty.warranty_end.replace(' ', 'T'))
                            warranty.warranty_end = parsed_date.date()
                        else:
                            warranty.warranty_end = date.fromisoformat(warranty.warranty_end)
                except (ValueError, TypeError, AttributeError):
                    # If we can't process the date, leave it as is or set to None
                    # Don't raise an exception, just continue
                    pass

        return warranties
    except Exception as e:
        # Log the error but return an empty list instead of raising an exception
        print(f"Error in get_recent_warranties: {e}")
        return []