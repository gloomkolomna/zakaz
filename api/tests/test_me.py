from models import User
from tests.conftest import make_user_client


def test_me_requires_auth(client):
    resp = client.get("/api/me")
    assert resp.status_code == 401


def test_me_player(player_client):
    resp = player_client.get("/api/me")
    assert resp.status_code == 200
    assert resp.json() == {"vk_id": 123, "display_name": None, "role": "player"}


def test_me_admin(admin_client):
    resp = admin_client.get("/api/me")
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"


def test_me_returns_display_name(db):
    db.add(User(vk_id=42, role="player", display_name="Анна"))
    db.commit()
    with make_user_client(42) as c:
        resp = c.get("/api/me")
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Анна"


def test_me_rejects_bad_token(client):
    resp = client.get("/api/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert resp.status_code == 401
