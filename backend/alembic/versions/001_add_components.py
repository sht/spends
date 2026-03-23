"""Add components table

Revision ID: 001_add_components
Revises: 000_initial_schema
Create Date: 2026-03-23

"""

from alembic import op
import sqlalchemy as sa


revision = "001_add_components"
down_revision = "000_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "components",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("purchase_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.DECIMAL(precision=10, scale=2), nullable=True),
        sa.Column("currency_code", sa.String(length=3), nullable=True),
        sa.Column("brand", sa.String(length=100), nullable=True),
        sa.Column("model_number", sa.String(length=100), nullable=True),
        sa.Column("serial_number", sa.String(length=100), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=True),
        sa.Column("link", sa.String(length=500), nullable=True),
        sa.Column("warranty_expiry", sa.Date(), nullable=True),
        sa.Column("warranty_type", sa.String(length=50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["purchase_id"], ["purchases.id"], ondelete="CASCADE"),
    )

    # Add component_id column to files table (no FK for SQLite)
    op.add_column("files", sa.Column("component_id", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("files", "component_id")
    op.drop_table("components")
