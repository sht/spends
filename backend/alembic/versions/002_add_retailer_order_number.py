"""Add retailer_order_number to purchases table

Revision ID: 002_add_retailer_order_number
Revises: 001_create_settings
Create Date: 2026-02-09

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_add_retailer_order_number'
down_revision = '001_create_settings'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add retailer_order_number column to purchases table
    op.add_column('purchases', sa.Column('retailer_order_number', sa.String(length=100), nullable=True))


def downgrade() -> None:
    # Remove retailer_order_number column from purchases table
    op.drop_column('purchases', 'retailer_order_number')
