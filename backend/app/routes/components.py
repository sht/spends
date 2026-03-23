from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database import get_db
from app.schemas.component import ComponentCreate, ComponentUpdate, ComponentResponse
from app.services import component_service

router = APIRouter(prefix="/api/components", tags=["components"])


@router.get("/{purchase_id}/", response_model=List[ComponentResponse])
async def list_components(
    purchase_id: str,
    db: AsyncSession = Depends(get_db),
):
    components = await component_service.get_components_by_purchase(db, purchase_id)
    return components


@router.post("/", response_model=ComponentResponse, status_code=status.HTTP_201_CREATED)
async def create_component(
    component: ComponentCreate,
    db: AsyncSession = Depends(get_db),
):
    return await component_service.create_component(db, component.model_dump())


@router.put("/{component_id}/", response_model=ComponentResponse)
async def update_component(
    component_id: str,
    component_update: ComponentUpdate,
    db: AsyncSession = Depends(get_db),
):
    update_data = component_update.model_dump(exclude_unset=True)
    updated_component = await component_service.update_component(
        db, component_id, update_data
    )
    if not updated_component:
        raise HTTPException(status_code=404, detail="Component not found")
    return updated_component


@router.delete("/{component_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_component(
    component_id: str,
    db: AsyncSession = Depends(get_db),
):
    success = await component_service.delete_component(db, component_id)
    if not success:
        raise HTTPException(status_code=404, detail="Component not found")
    return
