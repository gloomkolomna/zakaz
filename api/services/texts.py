from __future__ import annotations

from models import Setting

TEXT_KEYS = ("delivery", "payment", "contacts", "privacy")


def get_texts(db) -> dict[str, str]:
    keys = [f"text.{key}" for key in TEXT_KEYS]
    rows = db.query(Setting).filter(Setting.key.in_(keys)).all()
    values = {row.key: row.value for row in rows}
    return {key: values.get(f"text.{key}", "") for key in TEXT_KEYS}


def set_texts(db, values: dict[str, str]) -> dict[str, str]:
    for key in TEXT_KEYS:
        if key not in values:
            continue
        setting_key = f"text.{key}"
        row = db.query(Setting).filter(Setting.key == setting_key).first()
        if row is None:
            row = Setting(key=setting_key, value=str(values[key]))
            db.add(row)
        else:
            row.value = str(values[key])
    db.commit()
    return get_texts(db)
