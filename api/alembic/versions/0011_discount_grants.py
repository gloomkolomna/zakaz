from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "discount_grants",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("vk_id", sa.Integer(), nullable=False),
        sa.Column("percent", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(), server_default="holidays", nullable=False),
        sa.Column("external_reward_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), server_default="available", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("order_id", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("external_reward_id"),
    )
    op.create_index("ix_discount_grants_vk_id", "discount_grants", ["vk_id"])
    with op.batch_alter_table("orders", schema=None) as batch_op:
        batch_op.add_column(sa.Column("subtotal", sa.Integer(), server_default="0", nullable=False))
        batch_op.add_column(sa.Column("discount_percent", sa.Integer(), server_default="0", nullable=False))
        batch_op.add_column(sa.Column("discount_amount", sa.Integer(), server_default="0", nullable=False))
        batch_op.add_column(sa.Column("discount_grant_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_orders_discount_grant", "discount_grants", ["discount_grant_id"], ["id"], ondelete="SET NULL")
    op.execute("UPDATE orders SET subtotal = total")


def downgrade() -> None:
    with op.batch_alter_table("orders", schema=None) as batch_op:
        batch_op.drop_constraint("fk_orders_discount_grant", type_="foreignkey")
        batch_op.drop_column("discount_grant_id")
        batch_op.drop_column("discount_amount")
        batch_op.drop_column("discount_percent")
        batch_op.drop_column("subtotal")
    op.drop_index("ix_discount_grants_vk_id", table_name="discount_grants")
    op.drop_table("discount_grants")
