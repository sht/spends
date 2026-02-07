"""Create settings table

Revision ID: 001_create_settings
Revises: 
Create Date: 2026-02-07

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001_create_settings'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
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
