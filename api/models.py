from __future__ import annotations

import datetime

from sqlalchemy import Boolean, Column, DateTime, Index, Integer, String, Text
from sqlalchemy.orm import declarative_base

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
    created_at = Column(DateTime, nullable=False, default=utcnow)


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
