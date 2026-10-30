"""single products

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-30 21:20:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0009'
down_revision: Union[str, None] = '0008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.add_column(sa.Column('mode', sa.String(), server_default='build', nullable=False))
        batch_op.add_column(sa.Column('price', sa.Integer(), nullable=True))

    op.create_table(
        'product_images',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('image_url', sa.String(), nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_product_images_product_sort', 'product_images', ['product_id', 'sort_order'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_product_images_product_sort', table_name='product_images')
    op.drop_table('product_images')
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.drop_column('price')
        batch_op.drop_column('mode')
