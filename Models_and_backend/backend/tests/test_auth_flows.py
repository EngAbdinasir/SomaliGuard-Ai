from datetime import datetime, timedelta, UTC

from conftest import auth_header


def test_send_email_uses_brevo_api_when_configured(app_module, monkeypatch):
    captured = {}

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

    def fake_urlopen(request, timeout):
        captured["url"] = request.full_url
        captured["headers"] = dict(request.header_items())
        captured["body"] = request.data.decode("utf-8")
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr(app_module.Config, "BREVO_API_KEY", "test-api-key")
    monkeypatch.setattr(app_module.Config, "BREVO_SENDER_EMAIL", "sender@example.com")
    monkeypatch.setattr(app_module, "urlopen", fake_urlopen)

    app_module.send_email("recipient@example.com", "Test subject", "Test content")

    assert captured["url"] == "https://api.brevo.com/v3/smtp/email"
    assert {key.lower(): value for key, value in captured["headers"].items()}["api-key"] == "test-api-key"
    assert '"email": "recipient@example.com"' in captured["body"]
    assert captured["timeout"] == 20


def test_register_rejects_invalid_email(client):
    response = client.post(
        "/register",
        json={"full_name": "Bad Email", "email": "not-an-email", "password": "secret123"},
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "A valid email address is required."


def test_send_verification_code_creates_code_and_sends_email(client, app_module, monkeypatch):
    created = {}

    monkeypatch.setattr(app_module, "find_user_by_email", lambda email: None)
    monkeypatch.setattr(
        app_module,
        "create_email_verification_code",
        lambda email, code: created.update({"email": email, "code": code}) or 1,
    )
    monkeypatch.setattr(
        app_module,
        "send_email_verification_code",
        lambda email, code: created.update({"sent_to": email, "sent_code": code}),
    )

    response = client.post("/send-verification-code", json={"email": "new@example.com"})

    assert response.status_code == 200
    assert response.get_json()["message"] == "We sent a verification code. Check your Inbox and Spam folder."
    assert created["email"] == "new@example.com"
    assert created["sent_to"] == "new@example.com"
    assert created["code"] == created["sent_code"]
    assert len(created["code"]) == 6
    assert created["code"].isdigit()


def test_register_requires_valid_verification_code(client, app_module, monkeypatch):
    monkeypatch.setattr(app_module, "verify_email_verification_code", lambda email, code: None)

    response = client.post(
        "/register",
        json={
            "full_name": "New User",
            "email": "new@example.com",
            "password": "secret123",
            "verification_code": "123456",
        },
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "Invalid or expired verification code."


def test_register_creates_user_after_email_verification(client, app_module, monkeypatch):
    created = {}

    monkeypatch.setattr(app_module, "verify_email_verification_code", lambda email, code: {"id": 99, "email": email})
    monkeypatch.setattr(app_module, "hash_password", lambda password: f"hashed:{password}")
    monkeypatch.setattr(
        app_module,
        "create_user",
        lambda full_name, email, password_hash, role="user": created.update({
            "full_name": full_name,
            "email": email,
            "password_hash": password_hash,
            "role": role,
        }) or 12,
    )
    monkeypatch.setattr(app_module, "mark_email_verification_code_used", lambda code_id: created.update({"code_id": code_id}) or 1)

    response = client.post(
        "/register",
        json={
            "full_name": "New User",
            "email": "new@example.com",
            "password": "secret123",
            "verification_code": "123456",
        },
    )
    data = response.get_json()

    assert response.status_code == 201
    assert data["message"] == "Registration successful."
    assert data["user"]["email"] == "new@example.com"
    assert created == {
        "full_name": "New User",
        "email": "new@example.com",
        "password_hash": "hashed:secret123",
        "role": "user",
        "code_id": 99,
    }


def test_login_success_returns_token(client, app_module, active_user, monkeypatch):
    monkeypatch.setattr(app_module, "find_user_by_email", lambda email: {**active_user, "password_hash": "hash"})
    monkeypatch.setattr(app_module, "verify_password", lambda password, password_hash: True)

    response = client.post("/login", json={"email": active_user["email"], "password": "secret123"})
    data = response.get_json()

    assert response.status_code == 200
    assert data["token"]
    assert data["user"]["email"] == active_user["email"]


def test_history_requires_token(client):
    response = client.get("/history")

    assert response.status_code == 401
    assert response.get_json()["error"] == "Authorization token is required."


def test_admin_dashboard_rejects_regular_user(client, app_module, active_user, monkeypatch):
    import auth

    monkeypatch.setattr(auth, "find_user_by_id", lambda user_id: active_user)

    response = client.get("/admin/dashboard", headers=auth_header(app_module, active_user))

    assert response.status_code == 403
    assert response.get_json()["error"] == "Admin access is required."


def test_forgot_password_uses_generic_message_and_creates_token(client, app_module, active_user, monkeypatch):
    created = {}

    monkeypatch.setattr(app_module, "find_user_by_email", lambda email: active_user)
    monkeypatch.setattr(app_module, "create_password_reset_token", lambda user_id, token: created.update({"user_id": user_id, "token": token}) or 1)
    monkeypatch.setattr(app_module.Config, "SMTP_HOST", "")
    monkeypatch.setattr(app_module.Config, "SMTP_USER", "")
    monkeypatch.setattr(app_module.Config, "SMTP_PASSWORD", "")
    monkeypatch.setattr(app_module.Config, "IS_PRODUCTION", False)

    response = client.post("/forgot-password", json={"email": active_user["email"]})
    data = response.get_json()

    assert response.status_code == 200
    assert data["message"] == app_module.RESET_GENERIC_MESSAGE
    assert created["user_id"] == active_user["id"]
    assert len(created["token"]) > 30


def test_forgot_password_unknown_email_still_uses_generic_message(client, app_module, monkeypatch):
    monkeypatch.setattr(app_module, "find_user_by_email", lambda email: None)

    response = client.post("/forgot-password", json={"email": "missing@example.com"})

    assert response.status_code == 200
    assert response.get_json()["message"] == app_module.RESET_GENERIC_MESSAGE


def test_reset_password_rejects_weak_password(client):
    response = client.post(
        "/reset-password",
        json={
            "token": "valid-token",
            "new_password": "weak",
            "confirm_password": "weak",
        },
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "Password must be at least 8 characters."


def test_reset_password_updates_hash_and_marks_token_used(client, app_module, monkeypatch):
    reset_record = {
        "id": 1,
        "user_id": 7,
        "token": "valid-token",
        "expires_at": datetime.now(UTC) + timedelta(minutes=10),
        "used": False,
    }
    updated = {}

    monkeypatch.setattr(app_module, "verify_password_reset_token", lambda token: reset_record)
    monkeypatch.setattr(app_module, "hash_password", lambda password: f"hashed:{password}")
    monkeypatch.setattr(
        app_module,
        "update_user_password",
        lambda user_id, password_hash, reset_token: updated.update(
            {"user_id": user_id, "password_hash": password_hash, "reset_token": reset_token}
        ) or 1,
    )

    response = client.post(
        "/reset-password",
        json={
            "token": "valid-token",
            "new_password": "Strongpass1",
            "confirm_password": "Strongpass1",
        },
    )

    assert response.status_code == 200
    assert response.get_json()["message"] == "Password reset successful."
    assert updated == {
        "user_id": 7,
        "password_hash": "hashed:Strongpass1",
        "reset_token": "valid-token",
    }
