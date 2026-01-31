"""add tax_deductible and other fields to purchases

Revision ID: 3468abcae249
Revises: e1cd33416662
Create Date: 2026-01-30 11:13:05.930084

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3468abcae249'
down_revision = 'e1cd33416662'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add tax_deductible column
    op.add_column('purchases', sa.Column('tax_deductible', sa.Integer(), default=0))

    # Add other missing columns that should have been in the initial migration
    op.add_column('purchases', sa.Column('model_number', sa.String(100)))
    op.add_column('purchases', sa.Column('serial_number', sa.String(100)))
    op.add_column('purchases', sa.Column('quantity', sa.Integer(), default=1))
    op.add_column('purchases', sa.Column('link', sa.String(500)))
    op.add_column('purchases', sa.Column('return_deadline', sa.DateTime()))  # Initially DateTime, will be converted later
    op.add_column('purchases', sa.Column('return_policy', sa.String(50)))
    op.add_column('purchases', sa.Column('tags', sa.String(255)))


def downgrade() -> None:
    op.drop_column('purchases', 'tax_deductible')
    op.drop_column('purchases', 'model_number')
    op.drop_column('purchases', 'serial_number')
    op.drop_column('purchases', 'quantity')
    op.drop_column('purchases', 'link')
    op.drop_column('purchases', 'return_deadline')
    op.drop_column('purchases', 'return_policy')
    op.drop_column('purchases', 'tags')