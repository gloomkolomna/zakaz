from models import Log


def test_4xx_is_logged(client, db):
    resp = client.get("/api/missing")
    assert resp.status_code == 404
    row = db.query(Log).filter(Log.path == "/api/missing").first()
    assert row is not None
    assert row.status_code == 404
    assert row.level == "warn"
    assert row.method == "GET"


def test_validation_error_is_logged(client, db):
    resp = client.post("/api/auth/session", json={})
    assert resp.status_code == 422
    row = db.query(Log).filter(Log.path == "/api/auth/session").first()
    assert row is not None
    assert row.status_code == 422


def test_401_is_not_logged(client, db):
    resp = client.get("/api/me")
    assert resp.status_code == 401
    assert db.query(Log).filter(Log.path == "/api/me").count() == 0
