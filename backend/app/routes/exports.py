from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import StreamingResponse
from io import StringIO
import json
from app.database import get_db
from app.utils.import_export import export_data_to_json, export_purchases_to_csv

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
            headers={"Content-Disposition": "attachment; filename=spends_data.json"}
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
            headers={"Content-Disposition": "attachment; filename=purchases.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting CSV: {str(e)}")