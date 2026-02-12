"""Data management routes for bulk operations."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from typing import Dict
import os
import shutil
from app.database import get_db
from app.models import Purchase, Warranty, Retailer, Brand, File, Setting
from app.config import settings

router = APIRouter(prefix="/api/data", tags=["data"])

UPLOAD_DIR = settings.uploads_dir


@router.post("/reset-all")
async def reset_all_data(db: AsyncSession = Depends(get_db)) -> Dict:
    """
    Delete all purchase data from the database and clear uploads directory.
    This action is irreversible.
    """
    try:
        # 1. Delete all files from database first (to avoid FK constraints)
        await db.execute(delete(File))

        # 2. Delete all warranties
        await db.execute(delete(Warranty))

        # 3. Delete all purchases
        await db.execute(delete(Purchase))

        # 4. Delete all retailers
        await db.execute(delete(Retailer))

        # 5. Delete all brands
        await db.execute(delete(Brand))

        # 6. Delete all settings (optional - reset to defaults)
        await db.execute(delete(Setting))

        # Commit all database changes
        await db.commit()

        # 7. Delete all files and folders in uploads directory
        uploads_deleted = 0
        if os.path.exists(UPLOAD_DIR):
            for item in os.listdir(UPLOAD_DIR):
                item_path = os.path.join(UPLOAD_DIR, item)
                try:
                    if os.path.isfile(item_path):
                        os.remove(item_path)
                        uploads_deleted += 1
                    elif os.path.isdir(item_path):
                        shutil.rmtree(item_path)
                        uploads_deleted += 1
                except Exception as e:
                    print(f"Error deleting {item_path}: {e}")

        return {
            "success": True,
            "message": "All data has been erased successfully",
            "details": {"database_cleared": True, "uploads_deleted": uploads_deleted},
        }

    except Exception as e:
        await db.rollback()
        print(f"Error during data reset: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reset data: {str(e)}")
