from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import json
from app.database import get_db
from app.utils.import_export import import_data_from_json, import_purchases_from_csv

router = APIRouter(prefix="/api/import", tags=["import"])


@router.post("/json")
async def import_data_json(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Import data from JSON file
    """
    if not file.filename.endswith('.json'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a JSON file."
        )
    
    try:
        contents = await file.read()
        json_data = json.loads(contents.decode('utf-8'))
        
        result = await import_data_from_json(db, json_data)
        return result
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing data: {str(e)}")


@router.post("/csv")
async def import_purchases_csv(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Import purchases from CSV file
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a CSV file."
        )
    
    try:
        contents = await file.read()
        csv_content = contents.decode('utf-8')
        
        result = await import_purchases_from_csv(db, csv_content)
        return result
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid CSV format - unable to decode file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing CSV: {str(e)}")