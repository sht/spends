import os
import hashlib
import shutil
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.file import File as FileModel
from app.schemas.file import FileCreate, FileUpdate
from app.models.purchase import Purchase
from app.config import settings
from uuid import UUID
import uuid


class FileService:
    def __init__(self, db: Session):
        self.db = db
        # Create uploads directory if it doesn't exist
        self.upload_dir = settings.uploads_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    def _calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA-256 hash of a file"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            # Read the file in chunks to handle large files efficiently
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def _get_file_path(self, stored_filename: str) -> str:
        """Get the full path for a stored file"""
        # Create subdirectories based on first 2 characters of filename for organization
        dir1 = stored_filename[:2]
        dir2 = stored_filename[2:4]
        path = os.path.join(self.upload_dir, dir1, dir2)
        os.makedirs(path, exist_ok=True)
        return os.path.join(path, stored_filename)

    def create_file(self, file_create: FileCreate, file_path: str) -> FileModel:
        """Create a new file record and move the file to storage"""
        # Calculate hash of the uploaded file
        file_hash = self._calculate_file_hash(file_path)

        # Check if file with same hash already exists (deduplication)
        existing_file = (
            self.db.query(FileModel).filter(FileModel.file_hash == file_hash).first()
        )
        if existing_file:
            # If file already exists, return the existing record
            return existing_file

        # Generate stored filename using the hash
        stored_filename = f"{file_hash}_{file_create.filename}"

        # Move the uploaded file to the storage location
        destination_path = self._get_file_path(stored_filename)
        os.makedirs(os.path.dirname(destination_path), exist_ok=True)
        shutil.move(file_path, destination_path)

        # Create file record in database
        db_file = FileModel(
            purchase_id=file_create.purchase_id,
            filename=file_create.filename,
            stored_filename=stored_filename,
            file_type=file_create.file_type,
            mime_type=file_create.mime_type,
            file_size=file_create.file_size,
            file_hash=file_hash,
        )

        self.db.add(db_file)
        self.db.commit()
        self.db.refresh(db_file)

        return db_file

    def get_file_by_id(self, file_id: str) -> Optional[FileModel]:
        """Get a file by its ID"""
        return self.db.query(FileModel).filter(FileModel.id == file_id).first()

    def get_file_by_hash(self, file_hash: str) -> Optional[FileModel]:
        """Get a file by its hash"""
        return self.db.query(FileModel).filter(FileModel.file_hash == file_hash).first()

    def get_files_by_purchase(
        self, purchase_id: str, skip: int = 0, limit: int = 20
    ) -> List[FileModel]:
        """Get all files for a specific purchase"""
        return (
            self.db.query(FileModel)
            .filter(FileModel.purchase_id == purchase_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_files_by_type(
        self, purchase_id: str, file_type: str, skip: int = 0, limit: int = 20
    ) -> List[FileModel]:
        """Get files of a specific type for a purchase"""
        return (
            self.db.query(FileModel)
            .filter(
                and_(
                    FileModel.purchase_id == purchase_id,
                    FileModel.file_type == file_type,
                )
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

    def update_file(self, file_id: str, file_update: FileUpdate) -> Optional[FileModel]:
        """Update a file record"""
        db_file = self.get_file_by_id(file_id)
        if db_file:
            for field, value in file_update.dict(exclude_unset=True).items():
                setattr(db_file, field, value)
            self.db.commit()
            self.db.refresh(db_file)
        return db_file

    def delete_file(self, file_id: str) -> bool:
        """Delete a file record and its physical file"""
        db_file = self.get_file_by_id(file_id)
        if db_file:
            # Remove the physical file
            file_path = self._get_file_path(db_file.stored_filename)
            if os.path.exists(file_path):
                os.remove(file_path)

            # Remove the record from database
            self.db.delete(db_file)
            self.db.commit()
            return True
        return False

    def delete_files_by_purchase(self, purchase_id: str) -> int:
        """Delete all files associated with a purchase"""
        files = self.get_files_by_purchase(purchase_id)
        deleted_count = 0

        for file in files:
            # Remove the physical file
            file_path = self._get_file_path(file.stored_filename)
            if os.path.exists(file_path):
                os.remove(file_path)

            # Remove the record from database
            self.db.delete(file)
            deleted_count += 1

        self.db.commit()
        return deleted_count
