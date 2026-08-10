from fastapi.testclient import TestClient

from app.main import app


def test_health_does_not_expose_internal_details():
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_protected_routes_require_access_key():
    with TestClient(app) as client:
        response = client.get("/jobs/not-a-job")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "ACCESS_DENIED"


def test_invalid_job_id_uses_public_error_contract():
    with TestClient(app) as client:
        response = client.get("/jobs/not-a-job", headers={"X-MVP-Key": "dev-only-change-me"})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_JOB_ID"
    assert response.json()["error"]["request_id"]
