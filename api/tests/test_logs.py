from models import Log
from tests.conftest import make_user_client


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


def test_admin_logs_only_errors_with_details(admin_client, db):
    db.add_all([
        Log(source="server", level="info", message="noise"),
        Log(source="server", level="warn", message="client error"),
        Log(
            source="server", level="error", event="exception",
            method="GET", path="/api/boom", status_code=500,
            message="Unhandled exception", client_ip="127.0.0.1",
            details='{"traceback": "Traceback: boom"}',
        ),
    ])
    db.commit()

    logs = admin_client.get("/api/admin/logs").json()
    assert len(logs) == 1
    assert logs[0]["level"] == "error"
    assert logs[0]["path"] == "/api/boom"
    assert logs[0]["client_ip"] == "127.0.0.1"
    assert "Traceback" in logs[0]["details"]

    with make_user_client(999) as player:
        assert player.get("/api/admin/logs").status_code == 403
