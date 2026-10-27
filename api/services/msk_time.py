from __future__ import annotations

import datetime

MSK = datetime.timezone(datetime.timedelta(hours=3))


def now_msk() -> datetime.datetime:
    return datetime.datetime.now(MSK)


def today_msk() -> datetime.date:
    return now_msk().date()


def msk_date_str(dt: datetime.datetime | None = None) -> str:
    if dt is None:
        dt = now_msk()
    return dt.date().isoformat()


def msk_day_start_utc(value: datetime.date) -> datetime.datetime:
    start = datetime.datetime.combine(value, datetime.time.min, tzinfo=MSK)
    return start.astimezone(datetime.timezone.utc).replace(tzinfo=None)


def msk_day_end_utc(value: datetime.date) -> datetime.datetime:
    return msk_day_start_utc(value + datetime.timedelta(days=1))
