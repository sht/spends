"""ZIP backup and restore functionality."""

import zipfile
import io
import os
import json
import shutil
from pathlib import Path
from typing import Dict, Any, BinaryIO
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Purchase, Warranty, Retailer, Brand, File, Setting
from app.utils.import_export import import_data_from_json, export_data_to_json
from app.config import settings

UPLOAD_DIR = Path(settings.uploads_dir)


async def create_full_backup(db: AsyncSession) -> bytes:
    """
    Create a complete ZIP backup containing:
    - data.json: All database records
    - uploads/: All files organized by hash subdirectories

    Returns: ZIP file as bytes
    """
    # Export all data to JSON
    data = await export_data_to_json(db)
    json_bytes = json.dumps(data, indent=2, default=str).encode("utf-8")

    # Create ZIP in memory
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Add data.json
        zf.writestr("data.json", json_bytes)

        # Add all files from uploads directory
        if UPLOAD_DIR.exists():
            for file_path in UPLOAD_DIR.rglob("*"):
                if file_path.is_file():
                    # Archive name preserves the directory structure
                    arc_name = f"uploads/{file_path.relative_to(UPLOAD_DIR)}"
                    zf.write(file_path, arc_name)

    zip_buffer.seek(0)
    return zip_buffer.getvalue()


async def restore_from_backup(db: AsyncSession, zip_bytes: bytes) -> Dict[str, Any]:
    """
    Restore data from a ZIP backup:
    1. Extract and import data.json
    2. Extract files to uploads directory

    Returns: Import results with counts
    """
    import_results = {
        "data_imported": False,
        "files_extracted": 0,
        "files_added": 0,
        "errors": [],
    }

    temp_dir = Path("temp_restore")

    try:
        # Create temp directory for extraction
        temp_dir.mkdir(exist_ok=True)

        # Extract ZIP to temp location
        zip_buffer = io.BytesIO(zip_bytes)
        with zipfile.ZipFile(zip_buffer, "r") as zf:
            zf.extractall(temp_dir)

        # Step 1: Import data.json
        data_json_path = temp_dir / "data.json"
        if data_json_path.exists():
            with open(data_json_path, "r", encoding="utf-8") as f:
                json_data = json.load(f)

            # Import database records
            result = await import_data_from_json(db, json_data)
            import_results.update(result)
            import_results["data_imported"] = True
        else:
            import_results["errors"].append("data.json not found in backup")
            return import_results

        # Step 2: Extract files
        temp_uploads = temp_dir / "uploads"
        if temp_uploads.exists():
            # Ensure uploads directory exists
            UPLOAD_DIR.mkdir(exist_ok=True)

            # Move/copy files preserving directory structure
            for temp_file_path in temp_uploads.rglob("*"):
                if temp_file_path.is_file():
                    # Calculate relative path (e.g., "ab/cd/hash123.jpg")
                    relative_path = temp_file_path.relative_to(temp_uploads)
                    target_path = UPLOAD_DIR / relative_path

                    # Create subdirectories if needed
                    target_path.parent.mkdir(parents=True, exist_ok=True)

                    # Copy file (skip if already exists)
                    if not target_path.exists():
                        shutil.copy2(temp_file_path, target_path)
                        import_results["files_extracted"] += 1
                    else:
                        # File already exists (same hash), skip but count as success
                        import_results["files_extracted"] += 1

        return import_results

    except Exception as e:
        import_results["errors"].append(f"Restore failed: {str(e)}")
        return import_results

    finally:
        # Cleanup temp directory
        if temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)
