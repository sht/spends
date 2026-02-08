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
        "warranties_added": 0,
        "retailers_added": 0,
        "brands_added": 0,
        "errors": []
    }
    
    try:
        # Import retailers first (since purchases reference them)
        if "retailers" in json_data:
            for retailer_data in json_data["retailers"]:
                # Check if retailer already exists
                existing_retailer_result = await db.execute(
                    select(Retailer).filter(Retailer.name == retailer_data["name"])
                )
                existing_retailer = existing_retailer_result.scalar_one_or_none()
                
                if not existing_retailer:
                    retailer = RetailerCreate(**retailer_data)
                    db_retailer = Retailer(**retailer.model_dump())
                    db.add(db_retailer)
                    import_results["retailers_added"] += 1
        
        # Import brands next
        if "brands" in json_data:
            for brand_data in json_data["brands"]:
                # Check if brand already exists
                existing_brand_result = await db.execute(
                    select(Brand).filter(Brand.name == brand_data["name"])
                )
                existing_brand = existing_brand_result.scalar_one_or_none()
                
                if not existing_brand:
                    brand = BrandCreate(**brand_data)
                    db_brand = Brand(**brand.model_dump())
                    db.add(db_brand)
                    import_results["brands_added"] += 1
        
        # Import purchases
        if "purchases" in json_data:
            for purchase_data in json_data["purchases"]:
                # Remove SQLAlchemy internal fields
                clean_data = {k: v for k, v in purchase_data.items() if not k.startswith('_')}
                
                # Check if purchase already exists (by ID)
                existing_purchase_result = await db.execute(
                    select(Purchase).filter(Purchase.id == clean_data["id"])
                )
                existing_purchase = existing_purchase_result.scalar_one_or_none()
                
                if not existing_purchase:
                    # Handle datetime conversion
                    if "purchase_date" in clean_data and isinstance(clean_data["purchase_date"], str):
                        clean_data["purchase_date"] = datetime.fromisoformat(clean_data["purchase_date"].replace('Z', '+00:00'))
                    
                    purchase = PurchaseCreate(**clean_data)
                    db_purchase = Purchase(**purchase.model_dump())
                    db.add(db_purchase)
                    import_results["purchases_added"] += 1
        
        # Import warranties
        if "warranties" in json_data:
            for warranty_data in json_data["warranties"]:
                # Remove SQLAlchemy internal fields
                clean_data = {k: v for k, v in warranty_data.items() if not k.startswith('_')}
                
                # Check if warranty already exists (by ID)
                existing_warranty_result = await db.execute(
                    select(Warranty).filter(Warranty.id == clean_data["id"])
                )
                existing_warranty = existing_warranty_result.scalar_one_or_none()
                
                if not existing_warranty:
                    # Handle datetime conversion
                    if "warranty_start" in clean_data and isinstance(clean_data["warranty_start"], str):
                        clean_data["warranty_start"] = datetime.fromisoformat(clean_data["warranty_start"].replace('Z', '+00:00'))
                    if "warranty_end" in clean_data and isinstance(clean_data["warranty_end"], str):
                        clean_data["warranty_end"] = datetime.fromisoformat(clean_data["warranty_end"].replace('Z', '+00:00'))
                    
                    warranty = WarrantyCreate(**clean_data)
                    db_warranty = Warranty(**warranty.model_dump())
                    db.add(db_warranty)
                    import_results["warranties_added"] += 1
        
        await db.commit()
        
    except Exception as e:
        await db.rollback()
        import_results["errors"].append(str(e))
    
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