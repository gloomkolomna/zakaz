"""initial

Revision ID: 0001
Revises: 
Create Date: 2026-10-27 15:45:30.114449
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa



revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('logs',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('source', sa.String(), nullable=False),
    sa.Column('level', sa.String(), server_default='info', nullable=False),
    sa.Column('event', sa.String(), nullable=True),
    sa.Column('method', sa.String(), nullable=True),
    sa.Column('path', sa.String(), nullable=True),
    sa.Column('status_code', sa.Integer(), nullable=True),
    sa.Column('message', sa.Text(), nullable=True),
    sa.Column('details', sa.Text(), nullable=True),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('client_ip', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('logs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_logs_created_at'), ['created_at'], unique=False)
        batch_op.create_index('ix_logs_level_created_at', ['level', 'created_at'], unique=False)

    op.create_table('settings',
    sa.Column('key', sa.String(), nullable=False),
    sa.Column('value', sa.Text(), nullable=False),
    sa.PrimaryKeyConstraint('key')
    )
    op.create_table('users',
    sa.Column('vk_id', sa.Integer(), nullable=False),
    sa.Column('role', sa.String(), server_default='player', nullable=False),
    sa.Column('status', sa.String(), server_default='active', nullable=False),
    sa.Column('display_name', sa.String(), nullable=True),
    sa.Column('is_member', sa.Boolean(), nullable=True),
    sa.Column('member_cached_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('vk_id')
    )


def downgrade() -> None:
    op.drop_table('users')
    op.drop_table('settings')
    with op.batch_alter_table('logs', schema=None) as batch_op:
        batch_op.drop_index('ix_logs_level_created_at')
        batch_op.drop_index(batch_op.f('ix_logs_created_at'))

    op.drop_table('logs')
