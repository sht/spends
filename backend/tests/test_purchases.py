import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.purchase import Purchase
from app.schemas.purchase import PurchaseCreate
from app.services.purchase_service import create_purchase
from datetime import datetime
from decimal import Decimal


@pytest.mark.asyncio
async def test_create_purchase(test_client: AsyncClient, db_session: AsyncSession):
    """Test creating a purchase via the API"""
    # First, create a retailer to associate with the purchase
    retailer_response = await test_client.post("/api/retailers/", json={
        "name": "Test Retailer",
        "url": "https://test-retailer.com"
    })
    assert retailer_response.status_code == 201
    retailer_data = retailer_response.json()
    retailer_id = retailer_data["id"]
    
    # Create a brand to associate with the purchase
    brand_response = await test_client.post("/api/brands/", json={
        "name": "Test Brand",
        "url": "https://test-brand.com"
    })
    assert brand_response.status_code == 201
    brand_data = brand_response.json()
    brand_id = brand_data["id"]
    
    # Prepare purchase data
    purchase_data = {
        "product_name": "Test Product",
        "price": "99.99",
        "currency_code": "USD",
        "retailer_id": retailer_id,
        "brand_id": brand_id,
        "status": "RECEIVED",
        "purchase_date": datetime.now().isoformat(),
        "notes": "Test purchase for testing"
    }
    
    # Create the purchase
    response = await test_client.post("/api/purchases/", json=purchase_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["product_name"] == "Test Product"
    assert data["price"] == "99.99"
    assert data["retailer_id"] == retailer_id
    assert data["brand_id"] == brand_id


@pytest.mark.asyncio
async def test_get_purchase(test_client: AsyncClient, db_session: AsyncSession):
    """Test retrieving a purchase via the API"""
    # First, create a retailer
    retailer_response = await test_client.post("/api/retailers/", json={
        "name": "Test Retailer 2",
        "url": "https://test-retailer2.com"
    })
    assert retailer_response.status_code == 201
    retailer_data = retailer_response.json()
    retailer_id = retailer_data["id"]
    
    # Create a brand
    brand_response = await test_client.post("/api/brands/", json={
        "name": "Test Brand 2",
        "url": "https://test-brand2.com"
    })
    assert brand_response.status_code == 201
    brand_data = brand_response.json()
    brand_id = brand_data["id"]
    
    # Create a purchase
    purchase_data = {
        "product_name": "Test Product 2",
        "price": "149.99",
        "currency_code": "USD",
        "retailer_id": retailer_id,
        "brand_id": brand_id,
        "status": "RECEIVED",
        "purchase_date": datetime.now().isoformat(),
        "notes": "Another test purchase"
    }
    
    create_response = await test_client.post("/api/purchases/", json=purchase_data)
    assert create_response.status_code == 201
    created_data = create_response.json()
    purchase_id = created_data["id"]
    
    # Retrieve the purchase
    response = await test_client.get(f"/api/purchases/{purchase_id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == purchase_id
    assert data["product_name"] == "Test Product 2"
    assert data["price"] == "149.99"


@pytest.mark.asyncio
async def test_list_purchases(test_client: AsyncClient, db_session: AsyncSession):
    """Test listing purchases via the API"""
    response = await test_client.get("/api/purchases/")
    
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)
    assert isinstance(data["total"], int)