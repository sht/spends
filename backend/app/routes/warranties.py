from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database import get_db
from app.models.warranty import Warranty
from app.schemas.warranty import WarrantyCreate, WarrantyUpdate, WarrantyResponse
from app.schemas.common import PaginatedResponse
from app.services.warranty_service import (
    get_warranty, get_warranties, create_warranty, update_warranty, delete_warranty
)

router = APIRouter(prefix="/api/warranties", tags=["warranties"])


@router.get("/", response_model=PaginatedResponse)
async def list_warranties(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    status: Optional[str] = Query(None),
    expiring_soon: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    warranties, total = await get_warranties(db, skip, limit, status, expiring_soon)

    # Convert SQLAlchemy models to Pydantic schemas
    warranty_responses = [WarrantyResponse.model_validate(w) for w in warranties]

    # Calculate number of pages
    pages = (total + limit - 1) // limit

    return PaginatedResponse(
        items=warranty_responses,
        total=total,
        page=skip // limit + 1,
        limit=limit,
        pages=pages
    )


@router.get("/{warranty_id}", response_model=WarrantyResponse)
async def get_single_warranty(warranty_id: str, db: AsyncSession = Depends(get_db)):
    warranty = await get_warranty(db, warranty_id)
    if not warranty:
        raise HTTPException(status_code=404, detail="Warranty not found")
    return warranty


@router.post("/", response_model=WarrantyResponse, status_code=status.HTTP_201_CREATED)
async def create_new_warranty(warranty: WarrantyCreate, db: AsyncSession = Depends(get_db)):
    return await create_warranty(db, warranty)


@router.put("/{warranty_id}", response_model=WarrantyResponse)
async def update_existing_warranty(
    warranty_id: str, 
    warranty_update: WarrantyUpdate, 
    db: AsyncSession = Depends(get_db)
):
    updated_warranty = await update_warranty(db, warranty_id, warranty_update)
    if not updated_warranty:
        raise HTTPException(status_code=404, detail="Warranty not found")
    return updated_warranty


@router.delete("/{warranty_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_warranty(warranty_id: str, db: AsyncSession = Depends(get_db)):
    success = await delete_warranty(db, warranty_id)
    if not success:
        raise HTTPException(status_code=404, detail="Warranty not found")
    return


@router.get("/expiring", response_model=List[WarrantyResponse])
async def get_expiring_warranties(
    days: int = Query(30, description="Number of days to check for expiring warranties"),
    db: AsyncSession = Depends(get_db)
):
    # This would require additional logic to filter warranties expiring within 'days' days
    # For now, returning all warranties
    warranties, _ = await get_warranties(db, skip=0, limit=100)
    return [WarrantyResponse.model_validate(w) for w in warranties]