"""remove status column from purchases

Revision ID: 53166c30e3a1
Revises: f29bf13efa67
Create Date: 2026-02-06 11:42:13.842097

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '53166c30e3a1'
down_revision = 'f29bf13efa67'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the status column from purchases table
    op.drop_column('purchases', 'status')
    
    # Note: SQLite doesn't support DROP TYPE, but the enum is no longer used
    # The column is dropped, which is sufficient for SQLite


def downgrade() -> None:
    # Add the status column back
    # For SQLite, we use String instead of Enum
    op.add_column('purchases', sa.Column('status', sa.String(10), nullable=True))
