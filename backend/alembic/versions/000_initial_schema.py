"""Initial schema with all tables

Revision ID: 000_initial_schema
Revises:
Create Date: 2026-02-09

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '000_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create retailers table
    op.create_table(
        'retailers',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # Create brands table
    op.create_table(
        'brands',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # Create purchases table
    op.create_table(
        'purchases',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('product_name', sa.String(length=255), nullable=False),
        sa.Column('price', sa.DECIMAL(precision=10, scale=2), nullable=False),
        sa.Column('currency_code', sa.String(length=3), nullable=True),
        sa.Column('retailer_id', sa.String(), nullable=True),
        sa.Column('brand_id', sa.String(), nullable=True),
        sa.Column('purchase_date', sa.Date(), nullable=False),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('tax_deductible', sa.Integer(), nullable=True),
        sa.Column('model_number', sa.String(length=100), nullable=True),
        sa.Column('serial_number', sa.String(length=100), nullable=True),
        sa.Column('retailer_order_number', sa.String(length=100), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=True),
        sa.Column('link', sa.String(length=500), nullable=True),
        sa.Column('return_deadline', sa.Date(), nullable=True),
        sa.Column('return_policy', sa.String(length=200), nullable=True),
        sa.Column('tags', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['brand_id'], ['brands.id'], ),
        sa.ForeignKeyConstraint(['retailer_id'], ['retailers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create warranties table
    op.create_table(
        'warranties',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('purchase_id', sa.String(), nullable=False),
        sa.Column('warranty_start', sa.Date(), nullable=True),
        sa.Column('warranty_end', sa.Date(), nullable=True),
        sa.Column('warranty_type', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('provider', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['purchase_id'], ['purchases.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('purchase_id')
    )

    # Create files table
    op.create_table(
        'files',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('purchase_id', sa.String(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('stored_filename', sa.String(length=255), nullable=False),
        sa.Column('file_type', sa.String(length=50), nullable=True),
        sa.Column('mime_type', sa.String(length=100), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('file_hash', sa.String(length=64), nullable=True),
        sa.Column('reference_count', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['purchase_id'], ['purchases.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create settings table
    op.create_table(
        'settings',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.String(length=500), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key')
    )
    op.create_index('ix_settings_key', 'settings', ['key'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_settings_key', table_name='settings')
    op.drop_table('settings')
    op.drop_table('files')
    op.drop_table('warranties')
    op.drop_table('purchases')
    op.drop_table('brands')
    op.drop_table('retailers')
