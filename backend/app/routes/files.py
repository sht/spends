from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import os
import hashlib
import aiofiles
from app.database import get_db
from app.models.purchase import Purchase
from app.models.file import File as FileModel, FileType
from app.schemas.file import FileResponse

router = APIRouter(prefix="/api/files", tags=["files"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/{purchase_id}/")
async def upload_file(
    purchase_id: str,
    file: UploadFile = File(...),
    file_type: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a file for a specific purchase
    """
    # Verify purchase exists - using async query
    result = await db.execute(
        select(Purchase).filter(Purchase.id == purchase_id)
    )
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    # Validate file type
    valid_types = ["receipt", "manual", "photo", "warranty", "other"]
    if file_type.lower() not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Valid types: {valid_types}"
        )

    # Read file contents and validate size (max 10MB)
    contents = await file.read()
    max_size = 10 * 1024 * 1024
    if len(contents) > max_size:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB")

    # Calculate file hash for deduplication
    file_hash = hashlib.sha256(contents).hexdigest()

    # Check if file already exists (based on hash) - using async query
    result = await db.execute(
        select(FileModel).filter(FileModel.file_hash == file_hash)
    )
    existing_file = result.scalar_one_or_none()
    if existing_file:
        return FileResponse.model_validate(existing_file)

    # Generate unique filename
    _, ext = os.path.splitext(file.filename)
    stored_filename = f"{file_hash}{ext}"

    # Create subdirectories based on first 2 chars of hash for organization
    subdir1 = file_hash[:2]
    subdir2 = file_hash[2:4]
    full_dir = os.path.join(UPLOAD_DIR, subdir1, subdir2)
    os.makedirs(full_dir, exist_ok=True)

    # Save file
    file_path = os.path.join(full_dir, stored_filename)
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(contents)

    # Convert string file_type to FileType enum
    file_type_enum = FileType(file_type.lower())
    
    # Create file record in database
    db_file = FileModel(
        purchase_id=purchase_id,
        filename=file.filename,
        stored_filename=stored_filename,
        file_type=file_type_enum,
        mime_type=file.content_type,
        file_size=len(contents),
        file_hash=file_hash
    )

    db.add(db_file)
    await db.commit()
    await db.refresh(db_file)

    return FileResponse.model_validate(db_file)


@router.get("/{purchase_id}/")
async def get_files_for_purchase(
    purchase_id: str,
    db: AsyncSession = Depends(get_db)
) -> List[FileResponse]:
    """
    Get all files for a specific purchase
    """
    # Verify purchase exists - using async query
    result = await db.execute(
        select(Purchase).filter(Purchase.id == purchase_id)
    )
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    # Get files for this purchase - using async query
    result = await db.execute(
        select(FileModel).filter(FileModel.purchase_id == purchase_id)
    )
    files = result.scalars().all()
    return [FileResponse.model_validate(f) for f in files]


@router.get("/{purchase_id}/{file_id}/")
async def get_file_by_id(
    purchase_id: str,
    file_id: str,
    db: AsyncSession = Depends(get_db)
) -> FileResponse:
    """
    Get a specific file by ID
    """
    # Verify purchase exists - using async query
    result = await db.execute(
        select(Purchase).filter(Purchase.id == purchase_id)
    )
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    # Get specific file - using async query
    from uuid import UUID
    try:
        file_uuid = UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid file ID format")
    
    result = await db.execute(
        select(FileModel).filter(
            FileModel.id == file_uuid,
            FileModel.purchase_id == purchase_id
        )
    )
    db_file = result.scalar_one_or_none()

    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse.model_validate(db_file)


@router.delete("/{purchase_id}/{file_id}/")
async def delete_file(
    purchase_id: str,
    file_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a specific file
    """
    # Verify purchase exists - using async query
    result = await db.execute(
        select(Purchase).filter(Purchase.id == purchase_id)
    )
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    # Get specific file - using async query
    from uuid import UUID
    try:
        file_uuid = UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid file ID format")
    
    result = await db.execute(
        select(FileModel).filter(
            FileModel.id == file_uuid,
            FileModel.purchase_id == purchase_id
        )
    )
    db_file = result.scalar_one_or_none()

    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    # Delete the physical file
    try:
        # Reconstruct file path from stored filename
        file_hash = db_file.file_hash
        subdir1 = file_hash[:2]
        subdir2 = file_hash[2:4]
        file_path = os.path.join(UPLOAD_DIR, subdir1, subdir2, db_file.stored_filename)

        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        # Even if we can't delete the physical file, still remove the DB record
        print(f"Error deleting physical file: {e}")

    # Delete the database record
    await db.delete(db_file)
    await db.commit()

    return {"message": "File deleted successfully"}


@router.get("/download/{file_id}/")
async def download_file(
    file_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Download a specific file
    """
    # Get file record - using async query
    from uuid import UUID
    try:
        file_uuid = UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid file ID format")
    
    result = await db.execute(
        select(FileModel).filter(FileModel.id == file_uuid)
    )
    db_file = result.scalar_one_or_none()

    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    # Reconstruct file path from stored filename
    file_hash = db_file.file_hash
    subdir1 = file_hash[:2]
    subdir2 = file_hash[2:4]
    file_path = os.path.join(UPLOAD_DIR, subdir1, subdir2, db_file.stored_filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    # Return file for download
    from fastapi.responses import FileResponse
    return FileResponse(
        path=file_path,
        media_type=db_file.mime_type,
        filename=db_file.filename
    )