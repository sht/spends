from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database import get_db
from app.models.brand import Brand
from app.schemas.brand import BrandCreate, BrandUpdate, BrandResponse
from app.schemas.common import PaginatedResponse
from app.services.brand_service import (
    get_brand, get_brands, create_brand, update_brand, delete_brand
)

router = APIRouter(prefix="/api/brands", tags=["brands"])


@router.get("/", response_model=PaginatedResponse)
async def list_brands(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db)
):
    brands, total = await get_brands(db, skip, limit)
    
    # Convert SQLAlchemy models to Pydantic schemas
    brand_responses = [BrandResponse.model_validate(b) for b in brands]
    
    # Calculate number of pages
    pages = (total + limit - 1) // limit
    
    return PaginatedResponse(
        items=brand_responses,
        total=total,
        page=skip // limit + 1,
        limit=limit,
        pages=pages
    )


@router.get("/{brand_id}", response_model=BrandResponse)
async def get_single_brand(brand_id: str, db: AsyncSession = Depends(get_db)):
    brand = await get_brand(db, brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return brand


@router.post("/", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
async def create_new_brand(brand: BrandCreate, db: AsyncSession = Depends(get_db)):
    return await create_brand(db, brand)


@router.put("/{brand_id}", response_model=BrandResponse)
async def update_existing_brand(
    brand_id: str, 
    brand_update: BrandUpdate, 
    db: AsyncSession = Depends(get_db)
):
    updated_brand = await update_brand(db, brand_id, brand_update)
    if not updated_brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return updated_brand


@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_brand(brand_id: str, db: AsyncSession = Depends(get_db)):
    success = await delete_brand(db, brand_id)
    if not success:
        raise HTTPException(status_code=404, detail="Brand not found")
    return