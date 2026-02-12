from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException,
    status,
    Request,
)
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
from app.config import settings

router = APIRouter(prefix="/api/files", tags=["files"])

UPLOAD_DIR = settings.uploads_dir
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/{purchase_id}/")
async def upload_file(
    purchase_id: str,
    file: UploadFile = File(...),
    file_type: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a file for a specific purchase
    """
    import traceback

    try:
        # Verify purchase exists - using async query
        result = await db.execute(select(Purchase).filter(Purchase.id == purchase_id))
        purchase = result.scalar_one_or_none()
        if not purchase:
            raise HTTPException(status_code=404, detail="Purchase not found")

        # Validate file type and convert to enum
        valid_types = ["receipt", "manual", "photo", "warranty", "other"]
        if file_type.lower() not in valid_types:
            raise HTTPException(
                status_code=400, detail=f"Invalid file type. Valid types: {valid_types}"
            )

        # Convert string file_type to FileType enum (lookup by value)
        file_type_enum = FileType(file_type.lower())

        # Read file contents and validate size (max 10MB)
        contents = await file.read()
        max_size = 10 * 1024 * 1024
        if len(contents) > max_size:
            raise HTTPException(
                status_code=413, detail="File too large. Maximum size is 10MB"
            )

        # Calculate file hash for deduplication
        file_hash = hashlib.sha256(contents).hexdigest()

        # Check if this purchase already has this file (same hash) - prevent duplicates within same purchase
        result = await db.execute(
            select(FileModel).filter(
                FileModel.file_hash == file_hash, FileModel.purchase_id == purchase_id
            )
        )
        existing_in_purchase = result.scalar_one_or_none()
        if existing_in_purchase:
            # Same file already exists in this purchase - return the existing file
            # Don't create a duplicate record
            return FileResponse.model_validate(
                existing_in_purchase, from_attributes=True
            )

        # Check if file already exists anywhere (based on hash) - using async query
        # Use .first() instead of .one_or_none() because multiple records may have same hash
        result = await db.execute(
            select(FileModel).filter(FileModel.file_hash == file_hash)
        )
        existing_file = result.scalars().first()
        if existing_file:
            # File content already exists, but we need to create a NEW record for this purchase
            # (same stored file can be referenced by multiple purchases)
            # Increment reference count on the existing file record
            existing_file.reference_count += 1

            db_file = FileModel(
                purchase_id=purchase_id,
                filename=file.filename,
                stored_filename=existing_file.stored_filename,
                file_type=file_type_enum,
                mime_type=file.content_type,
                file_size=len(contents),
                file_hash=file_hash,
                reference_count=0,  # This record doesn't own the physical file
            )
            db.add(db_file)
            await db.commit()
            await db.refresh(db_file)
            return FileResponse.model_validate(db_file, from_attributes=True)

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
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(contents)

        # Create file record in database
        db_file = FileModel(
            purchase_id=purchase_id,
            filename=file.filename,
            stored_filename=stored_filename,
            file_type=file_type_enum,
            mime_type=file.content_type,
            file_size=len(contents),
            file_hash=file_hash,
        )

        db.add(db_file)
        await db.commit()
        await db.refresh(db_file)

        return FileResponse.model_validate(db_file, from_attributes=True)

    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in upload_file: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{purchase_id}/")
async def get_files_for_purchase(
    purchase_id: str, db: AsyncSession = Depends(get_db)
) -> List[FileResponse]:
    """
    Get all files for a specific purchase
    """
    # Verify purchase exists - using async query
    result = await db.execute(select(Purchase).filter(Purchase.id == purchase_id))
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    # Get files for this purchase - using async query
    result = await db.execute(
        select(FileModel).filter(FileModel.purchase_id == purchase_id)
    )
    files = result.scalars().all()
    return [FileResponse.model_validate(f, from_attributes=True) for f in files]


@router.get("/{purchase_id}/{file_id}/")
async def get_file_by_id(
    purchase_id: str, file_id: str, db: AsyncSession = Depends(get_db)
) -> FileResponse:
    """
    Get a specific file by ID
    """
    # Verify purchase exists - using async query
    result = await db.execute(select(Purchase).filter(Purchase.id == purchase_id))
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
            FileModel.id == file_uuid, FileModel.purchase_id == purchase_id
        )
    )
    db_file = result.scalar_one_or_none()

    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse.model_validate(db_file, from_attributes=True)


@router.delete("/{purchase_id}/{file_id}/")
async def delete_file(
    purchase_id: str, file_id: str, db: AsyncSession = Depends(get_db)
):
    """
    Delete a specific file
    """
    # Verify purchase exists - using async query
    result = await db.execute(select(Purchase).filter(Purchase.id == purchase_id))
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
            FileModel.id == file_uuid, FileModel.purchase_id == purchase_id
        )
    )
    db_file = result.scalar_one_or_none()

    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    # Check if this record "owns" the physical file (reference_count > 0)
    # Find the file record that actually owns the physical file
    result = await db.execute(
        select(FileModel).filter(
            FileModel.file_hash == db_file.file_hash, FileModel.reference_count > 0
        )
    )
    file_owner = result.scalars().first()

    if file_owner and file_owner.reference_count > 0:
        # Decrement reference count
        file_owner.reference_count -= 1

        # Only delete physical file if reference count reaches 0
        if file_owner.reference_count == 0:
            try:
                # Reconstruct file path from stored filename
                file_hash = db_file.file_hash
                subdir1 = file_hash[:2]
                subdir2 = file_hash[2:4]
                file_path = os.path.join(
                    UPLOAD_DIR, subdir1, subdir2, db_file.stored_filename
                )

                if os.path.exists(file_path):
                    os.remove(file_path)
                    print(f"Physical file deleted (ref count reached 0): {file_path}")
            except Exception as e:
                print(f"Error deleting physical file: {e}")
        elif file_owner.id == db_file.id:
            # We're deleting the owner but other references exist.
            # Transfer ownership to another file with the same hash.
            result = await db.execute(
                select(FileModel).filter(
                    FileModel.file_hash == db_file.file_hash, FileModel.id != db_file.id
                )
            )
            another_file = result.scalars().first()
            if another_file:
                another_file.reference_count = file_owner.reference_count
                file_owner.reference_count = 0
                print(f"Transferred ownership from {db_file.id} to {another_file.id}")

    # Delete the database record
    await db.delete(db_file)
    await db.commit()

    return {"message": "File deleted successfully"}


@router.get("/file/{file_id}/download/")
async def download_file(file_id: str, db: AsyncSession = Depends(get_db)):
    """
    Download a specific file
    """
    # Get file record - using async query
    from uuid import UUID

    try:
        file_uuid = UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid file ID format")

    result = await db.execute(select(FileModel).filter(FileModel.id == file_uuid))
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

    # Set appropriate headers for inline display vs download
    # For images and PDFs, show inline; for others, force download
    inline_types = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
    ]
    disposition = "inline" if db_file.mime_type in inline_types else "attachment"

    return FileResponse(
        path=file_path,
        media_type=db_file.mime_type,
        filename=db_file.filename,
        headers={
            "Content-Disposition": f'{disposition}; filename="{db_file.filename}"'
        },
    )
