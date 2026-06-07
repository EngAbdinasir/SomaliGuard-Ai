import importlib
import sys
import types
from pathlib import Path

import pytest


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


@pytest.fixture()
def app_module(monkeypatch):
    fake_inference = types.ModuleType("inference")
    fake_inference.predict_text = lambda text: {
        "original_text": text,
        "cleaned_text": str(text).lower(),
        "prediction": "non-offensive",
        "confidence": 0.92,
        "model_name": "test-model",
    }
    fake_inference.predict_image = lambda image_path: {
        "image_path": str(image_path),
        "extracted_text": "sample text",
        "cleaned_text": "sample text",
        "prediction": "non-offensive",
        "confidence": 0.91,
        "model_name": "test-model",
    }
    monkeypatch.setitem(sys.modules, "inference", fake_inference)

    import database

    monkeypatch.setattr(database, "ensure_user_profile_picture_column", lambda: None)
    monkeypatch.setattr(database, "ensure_email_verification_table", lambda: None)
    monkeypatch.setattr(database, "ensure_database_indexes", lambda: None)
    module = importlib.import_module("app")
    module.app.config.update(TESTING=True, RATELIMIT_ENABLED=False)
    return module


@pytest.fixture()
def client(app_module):
    return app_module.app.test_client()


@pytest.fixture()
def active_user():
    return {
        "id": 1,
        "full_name": "Test User",
        "email": "user@example.com",
        "profile_picture": None,
        "role": "user",
        "is_active": True,
        "created_at": None,
    }


@pytest.fixture()
def admin_user():
    return {
        "id": 2,
        "full_name": "Admin User",
        "email": "admin@example.com",
        "profile_picture": None,
        "role": "admin",
        "is_active": True,
        "created_at": None,
    }


def auth_header(app_module, user):
    return {"Authorization": f"Bearer {app_module.generate_token(user)}"}
