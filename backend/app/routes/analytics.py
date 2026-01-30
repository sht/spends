from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database import get_db
from app.schemas.analytics import (
    SpendingAnalytics, WarrantyAnalytics, DistributionAnalytics,
    TopProductsAnalytics, SummaryAnalytics
)
from app.services.analytics_service import (
    get_spending_by_month, get_warranty_timeline,
    get_retailer_distribution, get_brand_distribution,
    get_top_products, get_spending_summary
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/spending", response_model=SpendingAnalytics)
async def get_spending_analytics(
    months: int = 12,
    db: AsyncSession = Depends(get_db)
):
    spending_data = await get_spending_by_month(db, months)
    return SpendingAnalytics(spending_over_time=spending_data)


@router.get("/spending/by-period")
async def get_spending_by_period(
    start_date: str = None,
    end_date: str = None,
    db: AsyncSession = Depends(get_db)
):
    # This would require additional implementation based on specific date range
    # For now, returning the default 12-month data
    spending_data = await get_spending_by_month(db, 12)
    return SpendingAnalytics(spending_over_time=spending_data)


@router.get("/summary", response_model=SummaryAnalytics)
async def get_summary_analytics(db: AsyncSession = Depends(get_db)):
    return await get_spending_summary(db)


@router.get("/warranties/timeline", response_model=WarrantyAnalytics)
async def get_warranty_timeline_analytics(
    months: int = 12,
    db: AsyncSession = Depends(get_db)
):
    timeline_data = await get_warranty_timeline(db, months)
    summary = {}  # Would compute summary from timeline data
    return WarrantyAnalytics(timeline=timeline_data, summary=summary)


@router.get("/warranties/summary", response_model=dict)
async def get_warranty_summary(db: AsyncSession = Depends(get_db)):
    # Get summary data for warranties
    active_stmt = "SELECT COUNT(*) FROM warranties WHERE status = 'ACTIVE'"
    expired_stmt = "SELECT COUNT(*) FROM warranties WHERE status = 'EXPIRED'"
    voided_stmt = "SELECT COUNT(*) FROM warranties WHERE status = 'VOIDED'"
    
    # For now, return a simple dictionary
    # In a real implementation, we would execute these queries
    return {
        "active": 0,
        "expired": 0,
        "voided": 0
    }


@router.get("/retailers", response_model=DistributionAnalytics)
async def get_retailer_analytics(db: AsyncSession = Depends(get_db)):
    retailers_data = await get_retailer_distribution(db)
    # Get brands data as well for the complete response
    brands_data = await get_brand_distribution(db)
    return DistributionAnalytics(retailers=retailers_data, brands=brands_data)


@router.get("/brands", response_model=DistributionAnalytics)
async def get_brand_analytics(db: AsyncSession = Depends(get_db)):
    brands_data = await get_brand_distribution(db)
    # Get retailers data as well for the complete response
    retailers_data = await get_retailer_distribution(db)
    return DistributionAnalytics(retailers=retailers_data, brands=brands_data)


@router.get("/top-products", response_model=TopProductsAnalytics)
async def get_top_products_analytics(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    top_products = await get_top_products(db, limit)
    return TopProductsAnalytics(top_products=top_products)


@router.get("/recent-purchases")
async def get_recent_purchases_analytics(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    from app.services.analytics_service import get_recent_purchases
    recent = await get_recent_purchases(db, limit)
    return recent


@router.get("/recent-warranties")
async def get_recent_warranties_analytics(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    from app.services.analytics_service import get_recent_warranties
    recent = await get_recent_warranties(db, limit)
    return recent