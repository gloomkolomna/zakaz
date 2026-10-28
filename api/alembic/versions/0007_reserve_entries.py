"""reserve entries

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-28 16:20:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0007'
down_revision: Union[str, None] = '0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'reserve_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.vk_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('product_id', 'user_id', name='uq_reserve_entries_product_user'),
    )
    op.create_index('ix_reserve_entries_product_created', 'reserve_entries', ['product_id', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_reserve_entries_product_created', table_name='reserve_entries')
    op.drop_table('reserve_entries')
