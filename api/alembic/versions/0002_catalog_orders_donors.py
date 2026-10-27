"""catalog, orders, donors

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-27 16:03:20.012256
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa



revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('donor_cache',
    sa.Column('vk_id', sa.Integer(), nullable=False),
    sa.Column('is_don', sa.Boolean(), server_default='0', nullable=False),
    sa.Column('don_since', sa.String(), nullable=True),
    sa.Column('updated_at', sa.String(), nullable=True),
    sa.Column('last_synced_at', sa.String(), nullable=True),
    sa.PrimaryKeyConstraint('vk_id')
    )
    op.create_table('sections',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
    sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('products',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('section_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('image_url', sa.String(), nullable=True),
    sa.Column('video_url', sa.String(), nullable=True),
    sa.Column('video_file_url', sa.String(), nullable=True),
    sa.Column('video_poster_url', sa.String(), nullable=True),
    sa.Column('early_until', sa.DateTime(), nullable=True),
    sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
    sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['section_id'], ['sections.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.create_index('ix_products_early_until', ['early_until'], unique=False)
        batch_op.create_index('ix_products_section_sort', ['section_id', 'sort_order'], unique=False)

    op.create_table('orders',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('buyer_name', sa.String(), nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=True),
    sa.Column('product_title', sa.String(), nullable=False),
    sa.Column('section_title', sa.String(), nullable=False),
    sa.Column('total', sa.Integer(), server_default='0', nullable=False),
    sa.Column('items_count', sa.Integer(), server_default='0', nullable=False),
    sa.Column('status', sa.String(), server_default='new', nullable=False),
    sa.Column('queue_order', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('read_at', sa.DateTime(), nullable=True),
    sa.Column('cancelled_at', sa.DateTime(), nullable=True),
    sa.Column('cancel_seen_at', sa.DateTime(), nullable=True),
    sa.Column('done_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.vk_id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_orders_created_at'), ['created_at'], unique=False)
        batch_op.create_index('ix_orders_status_cancel_seen', ['status', 'cancel_seen_at'], unique=False)
        batch_op.create_index('ix_orders_status_queue', ['status', 'queue_order'], unique=False)
        batch_op.create_index('ix_orders_user_created', ['user_id', 'created_at'], unique=False)

    op.create_table('product_steps',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('hint', sa.Text(), nullable=True),
    sa.Column('selection_mode', sa.String(), server_default='single', nullable=False),
    sa.Column('is_required', sa.Boolean(), server_default='0', nullable=False),
    sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
    sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('product_steps', schema=None) as batch_op:
        batch_op.create_index('ix_product_steps_product_sort', ['product_id', 'sort_order'], unique=False)

    op.create_table('step_cards',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('step_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('image_url', sa.String(), nullable=True),
    sa.Column('price', sa.Integer(), server_default='0', nullable=False),
    sa.Column('max_qty', sa.Integer(), server_default='10', nullable=False),
    sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
    sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['step_id'], ['product_steps.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('step_cards', schema=None) as batch_op:
        batch_op.create_index('ix_step_cards_step_sort', ['step_id', 'sort_order'], unique=False)

    op.create_table('order_items',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('order_id', sa.Integer(), nullable=False),
    sa.Column('card_id', sa.Integer(), nullable=True),
    sa.Column('step_title', sa.String(), nullable=False),
    sa.Column('card_title', sa.String(), nullable=False),
    sa.Column('image_url', sa.String(), nullable=True),
    sa.Column('price', sa.Integer(), nullable=False),
    sa.Column('qty', sa.Integer(), nullable=False),
    sa.Column('sum', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['card_id'], ['step_cards.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('order_items', schema=None) as batch_op:
        batch_op.create_index('ix_order_items_order', ['order_id'], unique=False)

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('donor_exempt', sa.Boolean(), server_default='0', nullable=False))


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('donor_exempt')

    with op.batch_alter_table('order_items', schema=None) as batch_op:
        batch_op.drop_index('ix_order_items_order')

    op.drop_table('order_items')
    with op.batch_alter_table('step_cards', schema=None) as batch_op:
        batch_op.drop_index('ix_step_cards_step_sort')

    op.drop_table('step_cards')
    with op.batch_alter_table('product_steps', schema=None) as batch_op:
        batch_op.drop_index('ix_product_steps_product_sort')

    op.drop_table('product_steps')
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.drop_index('ix_orders_user_created')
        batch_op.drop_index('ix_orders_status_queue')
        batch_op.drop_index('ix_orders_status_cancel_seen')
        batch_op.drop_index(batch_op.f('ix_orders_created_at'))

    op.drop_table('orders')
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.drop_index('ix_products_section_sort')
        batch_op.drop_index('ix_products_early_until')

    op.drop_table('products')
    op.drop_table('sections')
    op.drop_table('donor_cache')
