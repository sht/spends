import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.purchase import Purchase
from app.models.warranty import Warranty
from app.models.retailer import Retailer
from app.models.brand import Brand
from app.schemas.purchase import PurchaseCreate
from app.schemas.warranty import WarrantyCreate
from app.schemas.retailer import RetailerCreate
from app.schemas.brand import BrandCreate
from datetime import datetime
from decimal import Decimal


@pytest.mark.asyncio
async def test_spending_analytics(test_client: AsyncClient, db_session: AsyncSession):
    """Test spending analytics endpoint"""
    response = await test_client.get("/api/analytics/spending")
    
    assert response.status_code == 200
    data = response.json()
    assert "spending_over_time" in data
    assert isinstance(data["spending_over_time"], list)


@pytest.mark.asyncio
async def test_summary_analytics(test_client: AsyncSession, db_session: AsyncSession):
    """Test summary analytics endpoint"""
    response = await test_client.get("/api/analytics/summary")
    
    assert response.status_code == 200
    data = response.json()
    assert "total_spent" in data
    assert "avg_price" in data
    assert "total_items" in data
    assert "active_warranties" in data
    assert "expiring_warranties" in data


@pytest.mark.asyncio
async def test_retailer_analytics(test_client: AsyncClient, db_session: AsyncSession):
    """Test retailer analytics endpoint"""
    response = await test_client.get("/api/analytics/retailers")
    
    assert response.status_code == 200
    data = response.json()
    assert "retailers" in data
    assert "brands" in data
    assert isinstance(data["retailers"], list)
    assert isinstance(data["brands"], list)


@pytest.mark.asyncio
async def test_brand_analytics(test_client: AsyncClient, db_session: AsyncSession):
    """Test brand analytics endpoint"""
    response = await test_client.get("/api/analytics/brands")
    
    assert response.status_code == 200
    data = response.json()
    assert "retailers" in data
    assert "brands" in data
    assert isinstance(data["retailers"], list)
    assert isinstance(data["brands"], list)


@pytest.mark.asyncio
async def test_top_products_analytics(test_client: AsyncClient, db_session: AsyncSession):
    """Test top products analytics endpoint"""
    response = await test_client.get("/api/analytics/top-products")
    
    assert response.status_code == 200
    data = response.json()
    assert "top_products" in data
    assert isinstance(data["top_products"], list)