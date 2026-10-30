from __future__ import annotations

import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    vk_id = Column(Integer, primary_key=True)
    role = Column(String, nullable=False, default="player", server_default="player")
    status = Column(String, nullable=False, default="active", server_default="active")
    display_name = Column(String, nullable=True)
    is_member = Column(Boolean, nullable=True)
    member_cached_at = Column(DateTime, nullable=True)
    donor_exempt = Column(Boolean, nullable=False, default=False, server_default="0")
    created_at = Column(DateTime, nullable=False, default=utcnow)


class DonorCache(Base):
    __tablename__ = "donor_cache"

    vk_id = Column(Integer, primary_key=True)
    is_don = Column(Boolean, nullable=False, default=False, server_default="0")
    don_since = Column(String, nullable=True)
    updated_at = Column(String, nullable=True)
    last_synced_at = Column(String, nullable=True)


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    is_active = Column(Boolean, nullable=False, default=False, server_default="0")
    created_at = Column(DateTime, nullable=False, default=utcnow)

    products = relationship(
        "Product",
        back_populates="section",
        order_by="Product.sort_order",
        cascade="all, delete-orphan",
    )


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    section_id = Column(
        Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    mode = Column(String, nullable=False, default="build", server_default="build")
    price = Column(Integer, nullable=True)
    image_url = Column(String, nullable=True)
    video_url = Column(String, nullable=True)
    video_file_url = Column(String, nullable=True)
    video_poster_url = Column(String, nullable=True)
    early_until = Column(DateTime, nullable=True)
    stock = Column(Integer, nullable=False, default=0, server_default="0")
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    is_active = Column(Boolean, nullable=False, default=False, server_default="0")
    created_at = Column(DateTime, nullable=False, default=utcnow)

    section = relationship("Section", back_populates="products")
    images = relationship(
        "ProductImage",
        back_populates="product",
        order_by="ProductImage.sort_order",
        cascade="all, delete-orphan",
    )
    steps = relationship(
        "ProductStep",
        back_populates="product",
        order_by="ProductStep.sort_order",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_products_section_sort", "section_id", "sort_order"),
        Index("ix_products_early_until", "early_until"),
    )


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    image_url = Column(String, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime, nullable=False, default=utcnow)

    product = relationship("Product", back_populates="images")

    __table_args__ = (
        Index("ix_product_images_product_sort", "product_id", "sort_order"),
    )


class ProductStep(Base):
    __tablename__ = "product_steps"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String, nullable=False)
    hint = Column(Text, nullable=True)
    selection_mode = Column(String, nullable=False, default="single", server_default="single")
    is_required = Column(Boolean, nullable=False, default=False, server_default="0")
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    is_active = Column(Boolean, nullable=False, default=True, server_default="1")
    created_at = Column(DateTime, nullable=False, default=utcnow)

    product = relationship("Product", back_populates="steps")
    cards = relationship(
        "StepCard",
        back_populates="step",
        order_by="StepCard.sort_order",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_product_steps_product_sort", "product_id", "sort_order"),
    )


class StepCard(Base):
    __tablename__ = "step_cards"

    id = Column(Integer, primary_key=True, autoincrement=True)
    step_id = Column(
        Integer, ForeignKey("product_steps.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Integer, nullable=False, default=0, server_default="0")
    max_qty = Column(Integer, nullable=False, default=10, server_default="10")
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    is_active = Column(Boolean, nullable=False, default=True, server_default="1")
    created_at = Column(DateTime, nullable=False, default=utcnow)

    step = relationship("ProductStep", back_populates="cards")
    images = relationship(
        "StepCardImage",
        back_populates="card",
        order_by="StepCardImage.sort_order",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_step_cards_step_sort", "step_id", "sort_order"),
    )


class StepCardImage(Base):
    __tablename__ = "step_card_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    card_id = Column(
        Integer, ForeignKey("step_cards.id", ondelete="CASCADE"), nullable=False
    )
    image_url = Column(String, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime, nullable=False, default=utcnow)

    card = relationship("StepCard", back_populates="images")

    __table_args__ = (
        Index("ix_step_card_images_card_sort", "card_id", "sort_order"),
    )


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.vk_id", ondelete="CASCADE"), nullable=False)
    buyer_name = Column(String, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    product_title = Column(String, nullable=False)
    section_title = Column(String, nullable=False)
    total = Column(Integer, nullable=False, default=0, server_default="0")
    items_count = Column(Integer, nullable=False, default=0, server_default="0")
    comment = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="new", server_default="new")
    queue_order = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow, index=True)
    read_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    cancel_seen_at = Column(DateTime, nullable=True)
    done_at = Column(DateTime, nullable=True)

    items = relationship("OrderItem", back_populates="order", order_by="OrderItem.id")

    __table_args__ = (
        Index("ix_orders_status_queue", "status", "queue_order"),
        Index("ix_orders_status_cancel_seen", "status", "cancel_seen_at"),
        Index("ix_orders_user_created", "user_id", "created_at"),
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    card_id = Column(Integer, ForeignKey("step_cards.id", ondelete="SET NULL"), nullable=True)
    step_title = Column(String, nullable=False)
    card_title = Column(String, nullable=False)
    image_url = Column(String, nullable=True)
    price = Column(Integer, nullable=False)
    qty = Column(Integer, nullable=False)
    sum = Column(Integer, nullable=False)

    order = relationship("Order", back_populates="items")

    __table_args__ = (
        Index("ix_order_items_order", "order_id"),
    )


class ReserveEntry(Base):
    __tablename__ = "reserve_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(Integer, ForeignKey("users.vk_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=utcnow)

    __table_args__ = (
        UniqueConstraint("product_id", "user_id", name="uq_reserve_entries_product_user"),
        Index("ix_reserve_entries_product_created", "product_id", "created_at"),
    )


class Setting(Base):
    __tablename__ = "settings"
    key = Column(String, primary_key=True)
    value = Column(Text, nullable=False)


class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String, nullable=False)
    level = Column(String, nullable=False, default="info", server_default="info")
    event = Column(String, nullable=True)
    method = Column(String, nullable=True)
    path = Column(String, nullable=True)
    status_code = Column(Integer, nullable=True)
    message = Column(Text, nullable=True)
    details = Column(Text, nullable=True)
    user_id = Column(Integer, nullable=True)
    client_ip = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow, index=True)

    __table_args__ = (
        Index("ix_logs_level_created_at", "level", "created_at"),
    )
