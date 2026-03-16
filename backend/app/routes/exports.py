from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import StreamingResponse
from io import StringIO, BytesIO
import json
from datetime import datetime
from app.database import get_db
from app.utils.import_export import export_data_to_json, export_purchases_to_csv
from app.utils.zip_backup import (
    create_full_backup,
    create_backup_to_file,
    cleanup_old_backups,
    list_backups,
)

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/json")
async def export_all_data_json(db: AsyncSession = Depends(get_db)):
    """
    Export all data as JSON
    """
    try:
        data = await export_data_to_json(db)
        json_str = json.dumps(data, indent=2, default=str)
        return StreamingResponse(
            StringIO(json_str),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=spends_data.json"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting data: {str(e)}")


@router.get("/csv")
async def export_purchases_csv(db: AsyncSession = Depends(get_db)):
    """
    Export purchases as CSV
    """
    try:
        csv_content = await export_purchases_to_csv(db)
        return StreamingResponse(
            StringIO(csv_content),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=purchases.csv"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting CSV: {str(e)}")


@router.get("/zip")
async def export_full_backup_zip(db: AsyncSession = Depends(get_db)):
    """
    Export complete backup as ZIP (JSON data + all files)
    """
    try:
        zip_bytes = await create_full_backup(db)
        date_str = datetime.now().strftime("%Y-%m-%d")
        filename = f"spends_backup_{date_str}.zip"

        return StreamingResponse(
            BytesIO(zip_bytes),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating backup: {str(e)}")


@router.post("/backup/save")
async def save_backup_to_file(db: AsyncSession = Depends(get_db)):
    """
    Create and save backup to /app/data/backups/
    """
    try:
        result = await create_backup_to_file(db)
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving backup: {str(e)}")


@router.post("/backup/cleanup")
async def cleanup_old_backup_files(max_backups: int = 7):
    """
    Delete old backups, keeping only the latest max_backups (default: 7)
    """
    try:
        result = await cleanup_old_backups(max_backups)
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error cleaning up backups: {str(e)}"
        )


@router.get("/backup/list")
async def get_backup_list():
    """
    Get list of available backups
    """
    try:
        backups = list_backups()
        return {"backups": backups, "total": len(backups)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing backups: {str(e)}")
