import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def mock_env(monkeypatch):
    monkeypatch.setenv("USE_MOCK_RAG", "true")
    monkeypatch.setenv("USE_MOCK_CLAUDE", "true")


@pytest.fixture
def client():
    from app.main import app

    with TestClient(app) as c:
        yield c
