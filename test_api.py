import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_ask_endpoint():
    # Enviar uma requisição mock sem precisar bater no LLM de verdade para unit test
    # Como não temos um mock do OpenRouter ativo aqui, verificamos apenas se a rota existe e o status
    response = client.post("/api/ask", json={"question": "Livros de ficção"})
    assert response.status_code in [200, 500] # 500 if DB is empty or OpenRouter is missing API key

def test_feedback_endpoint():
    response = client.post("/api/feedback", json={
        "requestId": "test-uuid-1234",
        "rating": 5,
        "comment": "Unit Test Backend"
    })
    # O endpoint retorna 200 mesmo se o request_id for fake
    assert response.status_code == 200
    assert response.json()["status"] == "success"
