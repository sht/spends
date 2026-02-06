"""add reference_count to files

Revision ID: f29bf13efa67
Revises: 9303c9dcef80
Create Date: 2026-02-06 10:36:03.090408

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f29bf13efa67'
down_revision = '9303c9dcef80'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add reference_count column to files table
    op.add_column('files', sa.Column('reference_count', sa.Integer(), nullable=False, server_default='1'))


def downgrade() -> None:
    # Remove reference_count column
    op.drop_column('files', 'reference_count')
