import pytest
from fastapi.testclient import TestClient

from courtvision.main import app


class QuietEventBus:
    async def publish(self, game_id, event):
        return 0

    async def subscribe(self, game_id):
        await __import__("asyncio").Event().wait()
        if False:
            yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        app.state.event_bus = QuietEventBus()
        yield test_client
