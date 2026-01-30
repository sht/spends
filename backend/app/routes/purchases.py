from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database import get_db
from app.models.purchase import Purchase
from app.schemas.purchase import PurchaseCreate, PurchaseUpdate, PurchaseResponse
from app.schemas.common import PaginatedResponse
from app.services.purchase_service import (
    get_purchase, get_purchases, create_purchase, update_purchase, delete_purchase
)

router = APIRouter(prefix="/api/purchases", tags=["purchases"])


@router.get("/", response_model=PaginatedResponse)
async def list_purchases(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    status: Optional[str] = Query(None),
    retailer_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    purchases, total = await get_purchases(db, skip, limit, status, retailer_id, search)
    
    # Convert SQLAlchemy models to Pydantic schemas
    purchase_responses = [PurchaseResponse.model_validate(p) for p in purchases]
    
    # Calculate number of pages
    pages = (total + limit - 1) // limit
    
    return PaginatedResponse(
        items=purchase_responses,
        total=total,
        page=skip // limit + 1,
        limit=limit,
        pages=pages
    )


@router.get("/{purchase_id}", response_model=PurchaseResponse)
async def get_single_purchase(purchase_id: str, db: AsyncSession = Depends(get_db)):
    purchase = await get_purchase(db, purchase_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return purchase


@router.post("/", response_model=PurchaseResponse, status_code=status.HTTP_201_CREATED)
async def create_new_purchase(purchase: PurchaseCreate, db: AsyncSession = Depends(get_db)):
    return await create_purchase(db, purchase)


@router.put("/{purchase_id}", response_model=PurchaseResponse)
async def update_existing_purchase(
    purchase_id: str, 
    purchase_update: PurchaseUpdate, 
    db: AsyncSession = Depends(get_db)
):
    updated_purchase = await update_purchase(db, purchase_id, purchase_update)
    if not updated_purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return updated_purchase


@router.delete("/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_purchase(purchase_id: str, db: AsyncSession = Depends(get_db)):
    success = await delete_purchase(db, purchase_id)
    if not success:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return