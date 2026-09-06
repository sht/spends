"""add tags to components

Revision ID: 08bb3a24
Revises: 08bb3a23
Create Date: 2026-09-07

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '08bb3a24'
down_revision = '08bb3a23'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('components', sa.Column('tags', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('components', 'tags')
