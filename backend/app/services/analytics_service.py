from typing import List, Dict, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, extract, and_
from datetime import datetime, timedelta
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
    SummaryAnalytics
)


async def get_spending_by_month(db: AsyncSession, months: int = 12) -> List[SpendingByMonth]:
    """
    Get total spending over the specified number of months
    """
    # Calculate the date range
    today = datetime.utcnow()
    start_date = today - timedelta(days=months * 30)  # Approximate months as 30 days
    
    # Query to get spending grouped by month
    stmt = (
        select(
            func.strftime('%Y-%m', Purchase.purchase_date).label('month'),
            func.sum(Purchase.price).label('total_amount'),
            func.count(Purchase.id).label('item_count')
        )
        .where(Purchase.purchase_date >= start_date)
        .group_by(func.strftime('%Y-%m', Purchase.purchase_date))
        .order_by(func.strftime('%Y-%m', Purchase.purchase_date))
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    spending_data = []
    for row in rows:
        spending_data.append(SpendingByMonth(
            month=row.month,
            total_amount=row.total_amount or Decimal('0.00'),
            item_count=row.item_count or 0
        ))
    
    return spending_data


async def get_warranty_timeline(db: AsyncSession, months: int = 12) -> List[WarrantyTimelineItem]:
    """
    Get warranty timeline showing active, expired, and expiring soon warranties
    """
    # Calculate the date range
    today = datetime.utcnow()
    end_date = today + timedelta(days=months * 30)  # Future months to look ahead
    
    # For SQLite, we need to use a different approach since it doesn't have advanced date functions
    # We'll create a simplified version that groups warranties by their status
    stmt = select(Warranty)
    result = await db.execute(stmt)
    warranties = result.scalars().all()
    
    # Group warranties by month based on their end date
    monthly_data: Dict[str, Dict[str, int]] = {}
    
    for warranty in warranties:
        month_key = warranty.warranty_end.strftime('%Y-%m')
        if month_key not in monthly_data:
            monthly_data[month_key] = {'active': 0, 'expired': 0, 'expiring_soon': 0}
        
        # Determine status for this warranty
        if warranty.status.value == 'EXPIRED':
            monthly_data[month_key]['expired'] += 1
        elif warranty.status.value == 'ACTIVE':
            monthly_data[month_key]['active'] += 1
            # Check if it's expiring soon (within 30 days)
            if (warranty.warranty_end - today).days <= 30:
                monthly_data[month_key]['expiring_soon'] += 1
        elif warranty.status.value == 'VOIDED':
            # Voided warranties are neither active nor expired in the traditional sense
            pass
    
    # Convert to WarrantyTimelineItem objects
    timeline_items = []
    for month, counts in monthly_data.items():
        timeline_items.append(WarrantyTimelineItem(
            month=month,
            active=counts['active'],
            expired=counts['expired'],
            expiring_soon=counts['expiring_soon']
        ))
    
    # Sort by month
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


async def get_top_products(db: AsyncSession, limit: int = 10) -> List[TopProduct]:
    """
    Get top products by purchase count
    """
    stmt = (
        select(
            Purchase.product_name,
            func.count(Purchase.id).label('count'),
            func.sum(Purchase.price).label('total_spent'),
            func.avg(Purchase.price).label('avg_price')
        )
        .group_by(Purchase.product_name)
        .order_by(func.count(Purchase.id).desc())
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    top_products = []
    for row in rows:
        top_products.append(TopProduct(
            product_name=row.product_name,
            count=row.count,
            total_spent=row.total_spent or Decimal('0.00'),
            avg_price=row.avg_price or Decimal('0.00')
        ))
    
    return top_products


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
    today = datetime.utcnow()
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
    
    return SummaryAnalytics(
        total_spent=total_spent,
        avg_price=avg_price,
        total_items=total_items,
        active_warranties=active_warranties,
        expiring_warranties=expiring_warranties
    )


async def get_recent_purchases(db: AsyncSession, limit: int = 10) -> List:
    """
    Get recent purchases
    """
    stmt = (
        select(Purchase)
        .order_by(Purchase.created_at.desc())
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    purchases = result.scalars().all()
    
    return purchases


async def get_recent_warranties(db: AsyncSession, limit: int = 10) -> List:
    """
    Get recent warranties
    """
    stmt = (
        select(Warranty)
        .order_by(Warranty.created_at.desc())
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    warranties = result.scalars().all()
    
    return warranties