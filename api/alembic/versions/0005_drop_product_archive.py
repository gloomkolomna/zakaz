"""drop product archive

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-27 18:30:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = '0005'
down_revision: Union[str, None] = '0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.drop_index('ix_products_deleted_at')
        batch_op.drop_column('deleted_at')


def downgrade() -> None:
    import sqlalchemy as sa

    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.add_column(sa.Column('deleted_at', sa.DateTime(), nullable=True))
        batch_op.create_index('ix_products_deleted_at', ['deleted_at'], unique=False)
