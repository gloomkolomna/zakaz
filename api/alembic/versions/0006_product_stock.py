"""product stock

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-28 15:45:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0006'
down_revision: Union[str, None] = '0005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.add_column(sa.Column('stock', sa.Integer(), server_default='0', nullable=False))


def downgrade() -> None:
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.drop_column('stock')
