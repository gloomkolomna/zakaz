"""unpublished by default

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-27 18:10:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('sections', schema=None) as batch_op:
        batch_op.alter_column(
            'is_active',
            existing_type=sa.Boolean(),
            nullable=False,
            server_default='0',
        )
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.alter_column(
            'is_active',
            existing_type=sa.Boolean(),
            nullable=False,
            server_default='0',
        )


def downgrade() -> None:
    with op.batch_alter_table('sections', schema=None) as batch_op:
        batch_op.alter_column(
            'is_active',
            existing_type=sa.Boolean(),
            nullable=False,
            server_default='1',
        )
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.alter_column(
            'is_active',
            existing_type=sa.Boolean(),
            nullable=False,
            server_default='1',
        )
