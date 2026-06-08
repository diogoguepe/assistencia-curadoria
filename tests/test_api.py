import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_ask_endpoint():
    response = client.post("/api/ask", json={"question": "Livros de ficção"})
    assert response.status_code in [200, 500]

def test_feedback_endpoint():
    response = client.post("/api/feedback", json={
        "requestId": "test-uuid-1234",
        "rating": 5,
        "comment": "Unit Test Backend"
    })
    assert response.status_code == 200
    assert response.json()["status"] == "success"
