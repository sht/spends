from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database import get_db
from app.schemas.analytics import (
    SpendingAnalytics, WarrantyAnalytics, DistributionAnalytics,
    TopProductsAnalytics, ExpensivePurchasesAnalytics, SummaryAnalytics
)
from app.services.analytics_service import (
    get_spending_by_month, get_warranty_timeline,
    get_retailer_distribution, get_brand_distribution,
    get_top_products, get_expensive_purchases, get_spending_summary
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/spending", response_model=SpendingAnalytics)
async def get_spending_analytics(
    months: int = None,
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
    months: int = None,
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


@router.get("/expensive-purchases", response_model=ExpensivePurchasesAnalytics)
async def get_expensive_purchases_analytics(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    from app.services.analytics_service import get_expensive_purchases
    purchases = await get_expensive_purchases(db, limit)
    return ExpensivePurchasesAnalytics(purchases=purchases)


@router.get("/recent-purchases", response_model=List[dict])
async def get_recent_purchases_analytics(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    from app.models.purchase import Purchase
    from app.models.retailer import Retailer
    from app.models.brand import Brand
    from app.models.warranty import Warranty
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    # Query with proper relationship loading
    stmt = (
        select(Purchase)
        .options(selectinload(Purchase.retailer))
        .options(selectinload(Purchase.brand))
        .options(selectinload(Purchase.warranty))
        .order_by(Purchase.created_at.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    purchases = result.scalars().all()

    # Convert to dictionaries to avoid async relationship loading issues
    result_list = []
    for purchase in purchases:
        purchase_dict = {
            "id": purchase.id,
            "product_name": purchase.product_name,
            "price": float(purchase.price) if purchase.price else 0.0,
            "currency_code": purchase.currency_code,
            "status": None,  # Purchase status removed - warranty status available in warranty object
            "purchase_date": purchase.purchase_date.isoformat() if purchase.purchase_date else None,
            "notes": purchase.notes,
            "tax_deductible": purchase.tax_deductible,
            "model_number": purchase.model_number,
            "serial_number": purchase.serial_number,
            "quantity": purchase.quantity,
            "link": purchase.link,
            "return_deadline": purchase.return_deadline.isoformat() if purchase.return_deadline else None,
            "return_policy": purchase.return_policy,
            "tags": purchase.tags,
            "created_at": purchase.created_at.isoformat() if purchase.created_at else None,
            "updated_at": purchase.updated_at.isoformat() if purchase.updated_at else None,
            "warranty_id": purchase.warranty.id if hasattr(purchase, 'warranty') and purchase.warranty else None,
            "retailer": {
                "id": purchase.retailer.id,
                "name": purchase.retailer.name
            } if hasattr(purchase, 'retailer') and purchase.retailer else None,
            "brand": {
                "id": purchase.brand.id,
                "name": purchase.brand.name
            } if hasattr(purchase, 'brand') and purchase.brand else None,
            "warranty": {
                "id": purchase.warranty.id if hasattr(purchase, 'warranty') and purchase.warranty else None,
                "warranty_start": purchase.warranty.warranty_start.isoformat() if hasattr(purchase, 'warranty') and purchase.warranty and purchase.warranty.warranty_start else None,
                "warranty_end": purchase.warranty.warranty_end.isoformat() if hasattr(purchase, 'warranty') and purchase.warranty and purchase.warranty.warranty_end else None,
                "warranty_type": purchase.warranty.warranty_type if hasattr(purchase, 'warranty') and purchase.warranty else None,
                "status": purchase.warranty.status.value if hasattr(purchase, 'warranty') and purchase.warranty and purchase.warranty.status else None,
                "provider": purchase.warranty.provider if hasattr(purchase, 'warranty') and purchase.warranty else None,
                "notes": purchase.warranty.notes if hasattr(purchase, 'warranty') and purchase.warranty else None
            } if hasattr(purchase, 'warranty') and purchase.warranty else None
        }
        result_list.append(purchase_dict)
    return result_list


@router.get("/recent-warranties", response_model=List[dict])
async def get_recent_warranties_analytics(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    from app.services.analytics_service import get_recent_warranties
    from app.schemas.warranty import WarrantyResponse
    recent = await get_recent_warranties(db, limit)
    # Convert to Pydantic models for proper serialization
    return [WarrantyResponse.model_validate(w) for w in recent]