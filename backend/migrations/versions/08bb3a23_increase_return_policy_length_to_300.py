"""increase return_policy length to 300

Revision ID: 08bb3a23
Revises: 000_initial_schema
Create Date: 2026-02-19

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '08bb3a23'
down_revision = '000_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLite doesn't support ALTER COLUMN TYPE directly
    # The change is already reflected in the model, and SQLite doesn't enforce string lengths
    # This migration is a no-op for SQLite but documents the change
    # For PostgreSQL, this would be:
    # op.alter_column('purchases', 'return_policy',
    #                 existing_type=sa.String(200),
    #                 type_=sa.String(300),
    #                 existing_nullable=True)
    pass


def downgrade() -> None:
    # This is a no-op downgrade for SQLite
    # For PostgreSQL, this would be:
    # op.alter_column('purchases', 'return_policy',
    #                 existing_type=sa.String(300),
    #                 type_=sa.String(200),
    #                 existing_nullable=True)
    pass
