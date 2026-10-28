"""card images

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-28 20:55:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0008'
down_revision: Union[str, None] = '0007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'step_card_images',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('card_id', sa.Integer(), nullable=False),
        sa.Column('image_url', sa.String(), nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['card_id'], ['step_cards.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_step_card_images_card_sort', 'step_card_images', ['card_id', 'sort_order'], unique=False)
    op.execute(
        "INSERT INTO step_card_images (card_id, image_url, sort_order, created_at) "
        "SELECT id, image_url, 0, CURRENT_TIMESTAMP FROM step_cards "
        "WHERE image_url IS NOT NULL AND image_url <> ''"
    )
    with op.batch_alter_table('step_cards', schema=None) as batch_op:
        batch_op.drop_column('image_url')


def downgrade() -> None:
    with op.batch_alter_table('step_cards', schema=None) as batch_op:
        batch_op.add_column(sa.Column('image_url', sa.String(), nullable=True))
    op.execute(
        "UPDATE step_cards SET image_url = ("
        "SELECT image_url FROM step_card_images "
        "WHERE step_card_images.card_id = step_cards.id "
        "ORDER BY sort_order, id LIMIT 1)"
    )
    op.drop_index('ix_step_card_images_card_sort', table_name='step_card_images')
    op.drop_table('step_card_images')
