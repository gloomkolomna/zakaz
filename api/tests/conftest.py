import os
import sys

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["APP_ENV"] = "dev"
os.environ["DEV_LOGIN_ENABLED"] = "true"
os.environ["ADMIN_VK_IDS"] = "400977,795384"
os.environ["SECRET_KEY"] = "test-secret-not-for-prod"
os.environ["VK_APP_SECRET"] = "test-vk-secret"
os.environ["VK_SERVICE_TOKEN"] = ""
os.environ["VK_GROUP_ID"] = ""
os.environ["MEMBER_GATE_ENABLED"] = "false"
os.environ["DONUT_API_URL"] = ""
os.environ["DONUT_API_KEY"] = ""

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker

from db import get_db
from deps import get_current_user
from models import Base, User

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def _deny_user():
    from fastapi import HTTPException, status

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Не авторизован")


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def _make_user_override(vk_id: int, role: str):
    def _override():
        db = TestingSessionLocal()
        try:
            user = db.query(User).filter(User.vk_id == vk_id).first()
            if user is None:
                user = User(vk_id=vk_id, role=role)
                db.add(user)
                db.commit()
                db.refresh(user)
            yield user
        finally:
            db.close()

    return _override


def _setup_app(app):
    app.dependency_overrides[get_db] = _override_get_db
    app.state.session_factory = TestingSessionLocal


@pytest.fixture
def client():
    from main import app

    _setup_app(app)
    app.dependency_overrides[get_current_user] = _deny_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_client():
    from main import app

    _setup_app(app)
    app.dependency_overrides[get_current_user] = _make_user_override(400977, "admin")
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def player_client():
    from main import app

    _setup_app(app)
    app.dependency_overrides[get_current_user] = _make_user_override(123, "player")
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def raw_client():
    from main import app

    _setup_app(app)
    app.dependency_overrides.pop(get_current_user, None)
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def make_user_client(vk_id: int, role: str = "player"):
    from contextlib import contextmanager

    from main import app

    @contextmanager
    def _ctx():
        _setup_app(app)
        prev = app.dependency_overrides.get(get_current_user)
        app.dependency_overrides[get_current_user] = _make_user_override(vk_id, role)
        with TestClient(app) as c:
            yield c
        if prev is not None:
            app.dependency_overrides[get_current_user] = prev
        else:
            app.dependency_overrides.pop(get_current_user, None)

    return _ctx()
