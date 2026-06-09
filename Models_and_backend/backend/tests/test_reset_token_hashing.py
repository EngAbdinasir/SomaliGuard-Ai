import database


class FakeCursor:
    def __init__(self):
        self.lastrowid = 99
        self.rowcount = 1
        self.executions = []

    def execute(self, query, params=None):
        self.executions.append((query, params))

    def close(self):
        pass


class FakeConnection:
    def __init__(self):
        self.cursor_instance = FakeCursor()
        self.committed = False

    def cursor(self, *args, **kwargs):
        return self.cursor_instance

    def commit(self):
        self.committed = True

    def close(self):
        pass


def test_hash_reset_token_is_stable_and_not_raw():
    token = "raw-reset-token"

    first_hash = database.hash_reset_token(token)
    second_hash = database.hash_reset_token(token)

    assert first_hash == second_hash
    assert first_hash != token
    assert len(first_hash) == 64


def test_create_password_reset_token_stores_hash_not_raw(monkeypatch):
    fake_connection = FakeConnection()
    monkeypatch.setattr(database, "get_db_connection", lambda: fake_connection)

    token_id = database.create_password_reset_token(7, "raw-reset-token", expires_minutes=15)
    invalidate_query, invalidate_params = fake_connection.cursor_instance.executions[0]
    insert_query, insert_params = fake_connection.cursor_instance.executions[1]

    assert token_id == 99
    assert fake_connection.committed is True
    assert "UPDATE password_reset_tokens" in invalidate_query
    assert invalidate_params == (7,)
    assert "INSERT INTO password_reset_tokens" in insert_query
    assert insert_params[0] == 7
    assert insert_params[1] == database.hash_reset_token("raw-reset-token")
    assert insert_params[1] != "raw-reset-token"


def test_update_user_password_invalidates_all_unused_tokens(monkeypatch):
    fake_connection = FakeConnection()
    monkeypatch.setattr(database, "get_db_connection", lambda: fake_connection)

    database.update_user_password(7, "new-password-hash", reset_token="raw-reset-token")

    password_query, password_params = fake_connection.cursor_instance.executions[0]
    invalidate_query, invalidate_params = fake_connection.cursor_instance.executions[1]

    assert "UPDATE users SET password_hash" in password_query
    assert password_params == ("new-password-hash", 7)
    assert "UPDATE password_reset_tokens" in invalidate_query
    assert invalidate_params == (7,)
    assert fake_connection.committed is True
