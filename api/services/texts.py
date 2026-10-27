from __future__ import annotations

from models import Setting

INFO_KEYS = ("delivery", "payment", "contacts", "privacy")
CATALOG_KEYS = ("catalog_title", "catalog_description")
ALL_KEYS = INFO_KEYS + CATALOG_KEYS

DEFAULTS = {
    "catalog_title": "Наборы для вышивки",
    "catalog_description": "Трекеры на год и для хобби. Собираете набор по шагам — цена складывается сама.",
}


def get_texts(db, keys: tuple[str, ...] = INFO_KEYS) -> dict[str, str]:
    setting_keys = [f"text.{key}" for key in keys]
    rows = db.query(Setting).filter(Setting.key.in_(setting_keys)).all()
    values = {row.key: row.value for row in rows}
    return {key: values.get(f"text.{key}", DEFAULTS.get(key, "")) for key in keys}


def get_all_texts(db) -> dict[str, str]:
    return get_texts(db, ALL_KEYS)


def get_catalog_texts(db) -> dict[str, str]:
    return get_texts(db, CATALOG_KEYS)


def set_texts(db, values: dict[str, str]) -> dict[str, str]:
    for key in ALL_KEYS:
        if key not in values or values[key] is None:
            continue
        setting_key = f"text.{key}"
        row = db.query(Setting).filter(Setting.key == setting_key).first()
        if row is None:
            row = Setting(key=setting_key, value=str(values[key]))
            db.add(row)
        else:
            row.value = str(values[key])
    db.commit()
    return get_all_texts(db)
