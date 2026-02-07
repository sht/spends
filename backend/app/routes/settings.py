from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Optional
from pydantic import BaseModel
from app.database import get_db
from app.models import Setting

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsResponse(BaseModel):
    currency_code: str = "USD"
    date_format: str = "MM/DD/YYYY"


class SettingsUpdate(BaseModel):
    currency_code: Optional[str] = None
    date_format: Optional[str] = None


DEFAULT_SETTINGS = {
    "currency_code": "USD",
    "date_format": "MM/DD/YYYY"
}


async def get_setting(db: AsyncSession, key: str) -> Optional[str]:
    """Get a single setting value by key."""
    result = await db.execute(select(Setting).where(Setting.key == key))
    setting = result.scalar_one_or_none()
    return setting.value if setting else None


async def set_setting(db: AsyncSession, key: str, value: str) -> Setting:
    """Set a setting value, creating or updating as needed."""
    result = await db.execute(select(Setting).where(Setting.key == key))
    setting = result.scalar_one_or_none()
    
    if setting:
        setting.value = value
    else:
        setting = Setting(key=key, value=value)
        db.add(setting)
    
    await db.commit()
    await db.refresh(setting)
    return setting


@router.get("/", response_model=SettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Get all user settings with defaults."""
    settings_dict = {}
    
    for key, default_value in DEFAULT_SETTINGS.items():
        value = await get_setting(db, key)
        settings_dict[key] = value if value is not None else default_value
    
    return SettingsResponse(**settings_dict)


@router.put("/", response_model=SettingsResponse)
async def update_settings(settings_update: SettingsUpdate, db: AsyncSession = Depends(get_db)):
    """Update user settings. Only provided fields are updated."""
    update_data = settings_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        if value is not None:
            await set_setting(db, key, value)
    
    # Return updated settings
    return await get_settings(db)


@router.get("/{key}")
async def get_setting_by_key(key: str, db: AsyncSession = Depends(get_db)):
    """Get a specific setting by key."""
    if key not in DEFAULT_SETTINGS:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    
    value = await get_setting(db, key)
    return {"key": key, "value": value if value is not None else DEFAULT_SETTINGS[key]}


@router.post("/reset")
async def reset_settings(db: AsyncSession = Depends(get_db)):
    """Reset all settings to defaults."""
    # Delete all settings
    result = await db.execute(select(Setting))
    settings = result.scalars().all()
    
    for setting in settings:
        await db.delete(setting)
    
    await db.commit()
    
    return await get_settings(db)
