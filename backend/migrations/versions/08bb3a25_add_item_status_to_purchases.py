"""add item_status to purchases

Revision ID: 08bb3a25
Revises: 08bb3a24
Create Date: 2026-09-07

"""
from alembic import op
import sqlalchemy as sa


revision = '08bb3a25'
down_revision = '002_add_tags_to_components'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('purchases', sa.Column('item_status', sa.String(20), nullable=False, server_default='active'))


def downgrade() -> None:
    op.drop_column('purchases', 'item_status')
