def test_contact_message_sends_email(client, app_module, monkeypatch):
    sent = {}

    def fake_send_contact_email(name, sender_email, subject, message):
        sent.update({
            "name": name,
            "sender_email": sender_email,
            "subject": subject,
            "message": message,
        })

    monkeypatch.setattr(app_module, "send_contact_email", fake_send_contact_email)

    response = client.post(
        "/contact",
        json={
            "name": "Test Sender",
            "email": "sender@example.com",
            "subject": "Need help",
            "message": "Please contact me.",
        },
    )

    assert response.status_code == 200
    assert response.get_json()["message"] == "Thanks, your message has been sent. We will reply soon."
    assert sent == {
        "name": "Test Sender",
        "sender_email": "sender@example.com",
        "subject": "Need help",
        "message": "Please contact me.",
    }


def test_contact_message_requires_valid_email(client):
    response = client.post(
        "/contact",
        json={
            "name": "Test Sender",
            "email": "not-an-email",
            "subject": "Need help",
            "message": "Please contact me.",
        },
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "A valid email address is required."
