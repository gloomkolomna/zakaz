from __future__ import annotations

import os

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from config import DATABASE_URL

_IS_SQLITE = "sqlite" in DATABASE_URL
_IS_MEMORY_SQLITE = _IS_SQLITE and ":memory:" in DATABASE_URL


def _unicode_lower(value):
    if isinstance(value, str):
        return value.lower()
    return value


def enable_unicode_search(target_engine) -> None:
    if "sqlite" not in str(target_engine.url):
        return

    @event.listens_for(target_engine, "connect")
    def _register_unicode_lower(dbapi_connection, connection_record):
        dbapi_connection.create_function("lower", 1, _unicode_lower)


engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 30} if _IS_SQLITE else {},
    poolclass=NullPool if (_IS_SQLITE and not _IS_MEMORY_SQLITE) else None,
)
enable_unicode_search(engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    if _IS_SQLITE:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def init_db():
    from models import Base

    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
