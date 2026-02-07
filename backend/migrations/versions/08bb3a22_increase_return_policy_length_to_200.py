"""increase return_policy length to 200

Revision ID: 08bb3a22
Revises: f29bf13efa67
Create Date: 2026-02-07 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '08bb3a22'
down_revision = '53166c30e3a1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLite doesn't support ALTER COLUMN TYPE directly
    # The change is already reflected in the model, and SQLite doesn't enforce string lengths
    # This migration is a no-op for SQLite but documents the change
    pass


def downgrade() -> None:
    # This is a no-op downgrade for SQLite
    pass
