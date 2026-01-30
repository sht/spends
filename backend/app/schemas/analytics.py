from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from decimal import Decimal


class SpendingByMonth(BaseModel):
    month: str
    total_amount: Decimal
    item_count: int


class SpendingAnalytics(BaseModel):
    spending_over_time: List[SpendingByMonth]


class WarrantyTimelineItem(BaseModel):
    month: str
    active: int
    expired: int
    expiring_soon: int


class WarrantyAnalytics(BaseModel):
    timeline: List[WarrantyTimelineItem]
    summary: dict


class DistributionItem(BaseModel):
    name: str
    count: int
    percentage: float
    total_spent: Decimal


class DistributionAnalytics(BaseModel):
    retailers: List[DistributionItem]
    brands: List[DistributionItem]


class TopProduct(BaseModel):
    product_name: str
    count: int
    total_spent: Decimal
    avg_price: Decimal


class TopProductsAnalytics(BaseModel):
    top_products: List[TopProduct]


class SummaryAnalytics(BaseModel):
    total_spent: Decimal
    avg_price: Decimal
    total_items: int
    active_warranties: int
    expiring_warranties: int
    expired_warranties: int
    tax_deductible_count: int