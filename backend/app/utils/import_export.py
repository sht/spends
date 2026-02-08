import csv
import json
import io
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.purchase import Purchase
from app.models.warranty import Warranty
from app.models.retailer import Retailer
from app.models.brand import Brand
from app.schemas.purchase import PurchaseCreate
from app.schemas.warranty import WarrantyCreate
from app.schemas.retailer import RetailerCreate
from app.schemas.brand import BrandCreate
from sqlalchemy.future import select
from datetime import datetime


async def export_data_to_json(db: AsyncSession) -> Dict[str, Any]:
    """
    Export all data to JSON format
    """
    # Get all purchases with related data
    purchases_result = await db.execute(select(Purchase))
    purchases = purchases_result.scalars().all()
    
    # Get all warranties
    warranties_result = await db.execute(select(Warranty))
    warranties = warranties_result.scalars().all()
    
    # Get all retailers
    retailers_result = await db.execute(select(Retailer))
    retailers = retailers_result.scalars().all()
    
    # Get all brands
    brands_result = await db.execute(select(Brand))
    brands = brands_result.scalars().all()
    
    # Convert to dictionaries
    data = {
        "purchases": [purchase.__dict__ for purchase in purchases],
        "warranties": [warranty.__dict__ for warranty in warranties],
        "retailers": [retailer.__dict__ for retailer in retailers],
        "brands": [brand.__dict__ for brand in brands]
    }
    
    # Remove SQLAlchemy internal attributes
    for category in data.values():
        for item in category:
            item.pop('_sa_instance_state', None)
    
    return data


async def export_purchases_to_csv(db: AsyncSession) -> str:
    """
    Export purchases to CSV format
    """
    purchases_result = await db.execute(select(Purchase))
    purchases = purchases_result.scalars().all()
    
    # Create a StringIO buffer to write CSV data
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'id', 'product_name', 'price', 'currency_code', 'retailer_id', 
        'brand_id', 'purchase_date', 'notes', 'created_at', 'updated_at'
    ])
    
    # Write data rows
    for purchase in purchases:
        writer.writerow([
            purchase.id,
            purchase.product_name,
            float(purchase.price) if purchase.price else '',
            purchase.currency_code,
            purchase.retailer_id,
            purchase.brand_id,
            purchase.purchase_date.isoformat() if purchase.purchase_date else '',
            purchase.notes,
            purchase.created_at.isoformat() if purchase.created_at else '',
            purchase.updated_at.isoformat() if purchase.updated_at else ''
        ])
    
    # Get the CSV string
    csv_data = output.getvalue()
    output.close()
    
    return csv_data


async def import_data_from_json(db: AsyncSession, json_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Import data from JSON format
    """
    import_results = {
        "purchases_added": 0,
        "purchases_skipped_future_date": 0,
        "warranties_added": 0,
        "retailers_added": 0,
        "brands_added": 0,
        "errors": []
    }
    
    try:
        # Import retailers first (since purchases reference them)
        if "retailers" in json_data:
            for retailer_data in json_data["retailers"]:
                # Check if retailer already exists by ID
                existing_retailer_result = await db.execute(
                    select(Retailer).filter(Retailer.id == retailer_data["id"])
                )
                existing_retailer = existing_retailer_result.scalar_one_or_none()
                
                if not existing_retailer:
                    # Create retailer directly without schema validation
                    db_retailer = Retailer(
                        id=retailer_data["id"],
                        name=retailer_data["name"],
                        url=retailer_data.get("url", "")
                    )
                    db.add(db_retailer)
                    import_results["retailers_added"] += 1
        
        # Import brands next
        if "brands" in json_data:
            for brand_data in json_data["brands"]:
                # Check if brand already exists by ID
                existing_brand_result = await db.execute(
                    select(Brand).filter(Brand.id == brand_data["id"])
                )
                existing_brand = existing_brand_result.scalar_one_or_none()
                
                if not existing_brand:
                    # Create brand directly without schema validation
                    db_brand = Brand(
                        id=brand_data["id"],
                        name=brand_data["name"],
                        url=brand_data.get("url", "")
                    )
                    db.add(db_brand)
                    import_results["brands_added"] += 1
        
        # Import purchases
        if "purchases" in json_data:
            today = datetime.now().date()
            for purchase_data in json_data["purchases"]:
                # Check if purchase already exists (by ID)
                existing_purchase_result = await db.execute(
                    select(Purchase).filter(Purchase.id == purchase_data["id"])
                )
                existing_purchase = existing_purchase_result.scalar_one_or_none()
                
                if not existing_purchase:
                    # Parse purchase date
                    purchase_date = None
                    if purchase_data.get("purchase_date"):
                        purchase_date = datetime.fromisoformat(purchase_data["purchase_date"].replace('Z', '+00:00')).date()
                    
                    # Skip purchases with future dates
                    if purchase_date and purchase_date > today:
                        import_results["purchases_skipped_future_date"] += 1
                        continue
                    
                    return_deadline = None
                    if purchase_data.get("return_deadline"):
                        return_deadline = datetime.fromisoformat(purchase_data["return_deadline"].replace('Z', '+00:00')).date()
                    
                    # Create purchase directly with all fields from export
                    db_purchase = Purchase(
                        id=purchase_data["id"],
                        product_name=purchase_data["product_name"],
                        price=purchase_data["price"],
                        currency_code=purchase_data.get("currency_code", "USD"),
                        retailer_id=purchase_data.get("retailer_id"),
                        brand_id=purchase_data.get("brand_id"),
                        purchase_date=purchase_date,
                        notes=purchase_data.get("notes"),
                        tax_deductible=purchase_data.get("tax_deductible", 0),
                        model_number=purchase_data.get("model_number"),
                        serial_number=purchase_data.get("serial_number"),
                        quantity=purchase_data.get("quantity", 1),
                        link=purchase_data.get("link"),
                        return_deadline=return_deadline,
                        return_policy=purchase_data.get("return_policy"),
                        tags=purchase_data.get("tags"),
                        created_at=datetime.now(),
                        updated_at=datetime.now() if purchase_data.get("updated_at") else None
                    )
                    db.add(db_purchase)
                    import_results["purchases_added"] += 1
        
        # Import warranties
        if "warranties" in json_data:
            for warranty_data in json_data["warranties"]:
                # Check if warranty already exists (by ID)
                existing_warranty_result = await db.execute(
                    select(Warranty).filter(Warranty.id == warranty_data["id"])
                )
                existing_warranty = existing_warranty_result.scalar_one_or_none()
                
                if not existing_warranty:
                    # Parse dates
                    warranty_start = None
                    if warranty_data.get("warranty_start"):
                        warranty_start = datetime.fromisoformat(warranty_data["warranty_start"].replace('Z', '+00:00')).date()
                    
                    warranty_end = None
                    if warranty_data.get("warranty_end"):
                        warranty_end = datetime.fromisoformat(warranty_data["warranty_end"].replace('Z', '+00:00')).date()
                    
                    # Parse status - handle "WarrantyStatus.EXPIRED" format
                    status_str = warranty_data.get("status", "ACTIVE")
                    if status_str and "WarrantyStatus." in status_str:
                        status_str = status_str.split(".")[-1]  # Extract just "EXPIRED"
                    
                    # Create warranty directly
                    db_warranty = Warranty(
                        id=warranty_data["id"],
                        purchase_id=warranty_data["purchase_id"],
                        warranty_start=warranty_start,
                        warranty_end=warranty_end,
                        warranty_type=warranty_data.get("warranty_type"),
                        status=status_str,
                        provider=warranty_data.get("provider"),
                        notes=warranty_data.get("notes"),
                        created_at=datetime.now(),
                        updated_at=datetime.now() if warranty_data.get("updated_at") else None
                    )
                    db.add(db_warranty)
                    import_results["warranties_added"] += 1
        
        await db.commit()
        
    except Exception as e:
        await db.rollback()
        import_results["errors"].append(str(e))
        import_results["errors"].append(f"Error type: {type(e).__name__}")
    
    return import_results


async def import_purchases_from_csv(db: AsyncSession, csv_content: str) -> Dict[str, Any]:
    """
    Import purchases from CSV format
    """
    import_results = {
        "purchases_added": 0,
        "errors": []
    }
    
    try:
        # Parse CSV content
        csv_file = io.StringIO(csv_content)
        reader = csv.DictReader(csv_file)
        
        for row in reader:
            # Skip if purchase already exists
            existing_purchase_result = await db.execute(
                select(Purchase).filter(Purchase.id == row["id"])
            )
            existing_purchase = existing_purchase_result.scalar_one_or_none()
            
            if not existing_purchase:
                # Process the row data
                purchase_data = {
                    "id": row["id"],
                    "product_name": row["product_name"],
                    "price": float(row["price"]),
                    "currency_code": row["currency_code"] or "USD",
                    "retailer_id": row["retailer_id"] or None,
                    "brand_id": row["brand_id"] or None,
                    "purchase_date": datetime.fromisoformat(row["purchase_date"].replace('Z', '+00:00')),
                    "notes": row["notes"] or None
                }
                
                purchase = PurchaseCreate(**purchase_data)
                db_purchase = Purchase(**purchase.model_dump())
                db.add(db_purchase)
                import_results["purchases_added"] += 1
        
        await db.commit()
        
    except Exception as e:
        await db.rollback()
        import_results["errors"].append(str(e))
    
    return import_results