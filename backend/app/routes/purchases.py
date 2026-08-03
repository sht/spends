from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database import get_db
from app.models.purchase import Purchase
from app.models.file import FileType
from app.schemas.purchase import PurchaseCreate, PurchaseUpdate, PurchaseResponse
from app.schemas.common import PaginatedResponse
from app.services.purchase_service import (
    get_purchase,
    get_purchases,
    create_purchase,
    update_purchase,
    delete_purchase,
)

router = APIRouter(prefix="/api/purchases", tags=["purchases"])


def _get_photo_info(purchase):
    """Return (photo_id, photo_count) for a purchase based on its files."""
    photos = [
        f
        for f in purchase.files
        if (f.file_type.value if isinstance(f.file_type, FileType) else f.file_type)
        == FileType.PHOTO.value
    ]
    return (str(photos[0].id) if photos else None, len(photos))


@router.get("/", response_model=PaginatedResponse)
async def list_purchases(
    skip: int = 0,
    limit: int = 20,
    retailer_id: Optional[str] = None,
    search: Optional[str] = None,
    tag: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_direction: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    purchases, total, total_spending = await get_purchases(
        db, skip, limit, retailer_id, search, tag,
        sort_by=sort_by, sort_direction=sort_direction,
        date_from=date_from, date_to=date_to,
    )

    # Convert SQLAlchemy models to Pydantic schemas
    purchase_responses = []
    for p in purchases:
        resp = PurchaseResponse.model_validate(p)
        photo_id, photo_count = _get_photo_info(p)
        resp.photo_id = photo_id
        resp.photo_count = photo_count
        purchase_responses.append(resp)

    # Calculate number of pages
    pages = (total + limit - 1) // limit if limit > 0 else 1

    return PaginatedResponse(
        items=purchase_responses,
        total=total,
        page=skip // limit + 1 if limit > 0 else 1,
        limit=limit,
        pages=pages,
        total_spending=total_spending,
    )


@router.get("/{purchase_id}/", response_model=PurchaseResponse)
async def get_single_purchase(purchase_id: str, db: AsyncSession = Depends(get_db)):
    purchase = await get_purchase(db, purchase_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return purchase


@router.post("/", response_model=PurchaseResponse, status_code=status.HTTP_201_CREATED)
async def create_new_purchase(
    purchase: PurchaseCreate, db: AsyncSession = Depends(get_db)
):
    return await create_purchase(db, purchase)


@router.put("/{purchase_id}/", response_model=PurchaseResponse)
async def update_existing_purchase(
    purchase_id: str,
    purchase_update: PurchaseUpdate,
    db: AsyncSession = Depends(get_db),
):
    updated_purchase = await update_purchase(db, purchase_id, purchase_update)
    if not updated_purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return updated_purchase


@router.delete("/{purchase_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_purchase(
    purchase_id: str, db: AsyncSession = Depends(get_db)
):
    success = await delete_purchase(db, purchase_id)
    if not success:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return
