from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database import get_db
from app.models.retailer import Retailer
from app.schemas.retailer import RetailerCreate, RetailerUpdate, RetailerResponse, RetailerWithBrandStatus
from app.schemas.common import PaginatedResponse
from app.services.retailer_service import (
    get_retailer, get_retailers, get_retailers_with_brand_status,
    create_retailer, update_retailer, delete_retailer
)

router = APIRouter(prefix="/api/retailers", tags=["retailers"])


@router.get("/", response_model=PaginatedResponse)
async def list_retailers(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db)
):
    retailers, total = await get_retailers_with_brand_status(db, skip, limit)
    
    # Calculate number of pages
    pages = (total + limit - 1) // limit
    
    return PaginatedResponse(
        items=retailers,
        total=total,
        page=skip // limit + 1,
        limit=limit,
        pages=pages
    )


@router.get("/{retailer_id}", response_model=RetailerResponse)
async def get_single_retailer(retailer_id: str, db: AsyncSession = Depends(get_db)):
    retailer = await get_retailer(db, retailer_id)
    if not retailer:
        raise HTTPException(status_code=404, detail="Retailer not found")
    return retailer


@router.post("/", response_model=RetailerResponse, status_code=status.HTTP_201_CREATED)
async def create_new_retailer(retailer: RetailerCreate, db: AsyncSession = Depends(get_db)):
    return await create_retailer(db, retailer)


@router.put("/{retailer_id}", response_model=RetailerResponse)
async def update_existing_retailer(
    retailer_id: str, 
    retailer_update: RetailerUpdate, 
    db: AsyncSession = Depends(get_db)
):
    updated_retailer = await update_retailer(db, retailer_id, retailer_update)
    if not updated_retailer:
        raise HTTPException(status_code=404, detail="Retailer not found")
    return updated_retailer


@router.delete("/{retailer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_retailer(retailer_id: str, db: AsyncSession = Depends(get_db)):
    success = await delete_retailer(db, retailer_id)
    if not success:
        raise HTTPException(status_code=404, detail="Retailer not found")
    return
