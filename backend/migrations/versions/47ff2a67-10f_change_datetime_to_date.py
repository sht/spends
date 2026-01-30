"""change purchase_date and return_deadline from datetime to date

Revision ID: 47ff2a67-10f
Revises: 3468abcae249
Create Date: 2026-01-30 20:00:08

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '47ff2a67-10f'
down_revision = '3468abcae249'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Change purchase_date and return_deadline from DateTime to Date
    with op.batch_alter_table('purchases') as batch_op:
        batch_op.alter_column('purchase_date',
                              existing_type=sa.DateTime(),
                              type_=sa.Date(),
                              existing_nullable=False)
        batch_op.alter_column('return_deadline',
                              existing_type=sa.DateTime(),
                              type_=sa.Date(),
                              existing_nullable=True)


def downgrade() -> None:
    # Revert Date back to DateTime
    with op.batch_alter_table('purchases') as batch_op:
        batch_op.alter_column('purchase_date',
                              existing_type=sa.Date(),
                              type_=sa.DateTime(),
                              existing_nullable=False)
        batch_op.alter_column('return_deadline',
                              existing_type=sa.Date(),
                              type_=sa.DateTime(),
                              existing_nullable=True)
