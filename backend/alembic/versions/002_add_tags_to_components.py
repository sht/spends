"""Add tags column to components

Revision ID: 002_add_tags_to_components
Revises: 001_add_components
Create Date: 2026-03-23

"""

from alembic import op
import sqlalchemy as sa


revision = "002_add_tags_to_components"
down_revision = "001_add_components"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("components", sa.Column("tags", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("components", "tags")
