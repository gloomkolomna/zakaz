from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

import models  # noqa: F401
from models import Base

target_metadata = Base.metadata

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

try:
    from config import DATABASE_URL

    config.set_main_option("sqlalchemy.url", DATABASE_URL)
except Exception:
    pass


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch="sqlite" in config.get_main_option("sqlalchemy.url", ""),
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
