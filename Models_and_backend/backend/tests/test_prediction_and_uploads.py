from io import BytesIO

from conftest import auth_header


def test_predict_text_saves_history(client, app_module, active_user, monkeypatch):
    import auth

    saved = {}
    monkeypatch.setattr(auth, "find_user_by_id", lambda user_id: active_user)
    monkeypatch.setattr(
        app_module,
        "save_prediction",
        lambda **kwargs: saved.update(kwargs) or 42,
    )

    response = client.post(
        "/predict-text",
        json={"text": "Mahadsanid walaal"},
        headers=auth_header(app_module, active_user),
    )
    data = response.get_json()

    assert response.status_code == 200
    assert data["history_id"] == 42
    assert saved["user_id"] == active_user["id"]
    assert saved["input_type"] == "text"
    assert saved["original_text"] == "Mahadsanid walaal"


def test_predict_text_low_confidence_is_marked_for_review(client, app_module, active_user, monkeypatch):
    import auth

    saved = {}
    monkeypatch.setattr(auth, "find_user_by_id", lambda user_id: active_user)
    monkeypatch.setattr(
        app_module,
        "predict_text",
        lambda text: {
            "original_text": text,
            "cleaned_text": text,
            "prediction": "offensive",
            "confidence": 0.4,
            "model_name": "mBERT",
        },
    )
    monkeypatch.setattr(
        app_module,
        "save_prediction",
        lambda **kwargs: saved.update(kwargs) or 43,
    )

    response = client.post(
        "/predict-text",
        json={"text": "Waan hubinayaa"},
        headers=auth_header(app_module, active_user),
    )
    data = response.get_json()

    assert response.status_code == 200
    assert data["prediction"] == "needs_review"
    assert data["original_prediction"] == "offensive"
    assert data["review_reason"] == "low_confidence"
    assert saved["prediction"] == "needs_review"


def test_predict_image_rejects_unsupported_file_type(client, app_module, active_user, monkeypatch):
    import auth

    monkeypatch.setattr(auth, "find_user_by_id", lambda user_id: active_user)

    response = client.post(
        "/predict-image",
        data={"image": (BytesIO(b"not an image"), "note.txt")},
        headers=auth_header(app_module, active_user),
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "Unsupported file type. Use png, jpg, jpeg, or webp."


def test_predict_image_rejects_fake_image_content(client, app_module, active_user, monkeypatch):
    import auth

    monkeypatch.setattr(auth, "find_user_by_id", lambda user_id: active_user)

    response = client.post(
        "/predict-image",
        data={"image": (BytesIO(b"not really a png"), "fake.png")},
        headers=auth_header(app_module, active_user),
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "Uploaded file is not a valid image."


def test_users_endpoint_requires_admin(client, app_module, active_user, monkeypatch):
    import auth

    monkeypatch.setattr(auth, "find_user_by_id", lambda user_id: active_user)

    response = client.get("/users", headers=auth_header(app_module, active_user))

    assert response.status_code == 403
    assert response.get_json()["error"] == "Admin access is required."
