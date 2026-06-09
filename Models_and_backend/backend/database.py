from datetime import UTC, datetime, timedelta
import hashlib
import hmac

import mysql.connector
from mysql.connector import Error

from config import Config


def get_db_connection():
    connection_config = {
        "host": Config.DB_HOST,
        "port": Config.DB_PORT,
        "user": Config.DB_USER,
        "password": Config.DB_PASSWORD,
        "database": Config.DB_NAME,
    }
    if Config.DB_UNIX_SOCKET:
        connection_config["unix_socket"] = Config.DB_UNIX_SOCKET
    return mysql.connector.connect(**connection_config)


def ensure_user_profile_picture_column():
    connection = get_db_connection()
    cursor = None
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT COUNT(*) AS column_count
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'users'
              AND COLUMN_NAME = 'profile_picture'
            """,
            (Config.DB_NAME,),
        )
        result = cursor.fetchone()
        if not result or int(result["column_count"]) == 0:
            cursor.execute("ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255) NULL AFTER password_hash")
            connection.commit()
    finally:
        if cursor:
            cursor.close()
        connection.close()


def ensure_email_verification_table():
    connection = get_db_connection()
    cursor = None
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS email_verification_codes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(150) NOT NULL,
                code_hash VARCHAR(255) NOT NULL,
                expires_at DATETIME NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.commit()
    finally:
        if cursor:
            cursor.close()
        connection.close()


def ensure_database_indexes():
    indexes = [
        {
            "table": "email_verification_codes",
            "name": "idx_email_verification_email_used_expires",
            "columns": "email, used, expires_at",
        },
        {
            "table": "prediction_history",
            "name": "idx_prediction_history_user_created",
            "columns": "user_id, created_at",
        },
        {
            "table": "prediction_history",
            "name": "idx_prediction_history_created",
            "columns": "created_at",
        },
        {
            "table": "users",
            "name": "idx_users_role_active",
            "columns": "role, is_active",
        },
    ]
    connection = get_db_connection()
    cursor = None
    try:
        cursor = connection.cursor(dictionary=True)
        for index in indexes:
            cursor.execute(
                """
                SELECT COUNT(*) AS index_count
                FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = %s
                  AND TABLE_NAME = %s
                  AND INDEX_NAME = %s
                """,
                (Config.DB_NAME, index["table"], index["name"]),
            )
            result = cursor.fetchone()
            if result and int(result["index_count"]) > 0:
                continue

            cursor.execute(
                f"CREATE INDEX {index['name']} ON {index['table']} ({index['columns']})"
            )
        connection.commit()
    finally:
        if cursor:
            cursor.close()
        connection.close()


def _fetch_one(query, params=None):
    connection = get_db_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute(query, params or ())
        return cursor.fetchone()
    finally:
        cursor.close()
        connection.close()


def create_user(full_name, email, password_hash, role="user"):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO users (full_name, email, password_hash, role)
            VALUES (%s, %s, %s, %s)
            """,
            (full_name, email.lower(), password_hash, role),
        )
        connection.commit()
        return cursor.lastrowid
    finally:
        cursor.close()
        connection.close()


def find_user_by_email(email):
    return _fetch_one("SELECT * FROM users WHERE email = %s", (email.lower(),))


def find_user_by_id(user_id):
    return _fetch_one(
        """
        SELECT id, full_name, email, profile_picture, role, is_active, created_at
        FROM users
        WHERE id = %s
        """,
        (user_id,),
    )


def hash_reset_token(token):
    return hmac.new(
        Config.JWT_SECRET.encode("utf-8"),
        str(token).encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def hash_email_verification_code(email, code):
    value = f"{str(email).strip().lower()}:{str(code).strip()}"
    return hmac.new(
        Config.JWT_SECRET.encode("utf-8"),
        value.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def create_email_verification_code(email, code, expires_minutes=None):
    normalized_email = email.lower()
    expires_at = datetime.now(UTC) + timedelta(
        minutes=expires_minutes or Config.EMAIL_VERIFICATION_EXPIRES_MINUTES
    )
    code_hash = hash_email_verification_code(normalized_email, code)
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            "UPDATE email_verification_codes SET used = TRUE WHERE email = %s AND used = FALSE",
            (normalized_email,),
        )
        cursor.execute(
            """
            INSERT INTO email_verification_codes (email, code_hash, expires_at)
            VALUES (%s, %s, %s)
            """,
            (normalized_email, code_hash, expires_at),
        )
        connection.commit()
        return cursor.lastrowid
    finally:
        cursor.close()
        connection.close()


def verify_email_verification_code(email, code):
    normalized_email = email.lower()
    code_hash = hash_email_verification_code(normalized_email, code)
    return _fetch_one(
        """
        SELECT id, email, expires_at, used
        FROM email_verification_codes
        WHERE email = %s
          AND code_hash = %s
          AND used = FALSE
          AND expires_at > UTC_TIMESTAMP()
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (normalized_email, code_hash),
    )


def mark_email_verification_code_used(code_id):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            "UPDATE email_verification_codes SET used = TRUE WHERE id = %s",
            (code_id,),
        )
        connection.commit()
        return cursor.rowcount
    finally:
        cursor.close()
        connection.close()


def create_password_reset_token(user_id, token, expires_minutes=None):
    expires_at = datetime.now(UTC) + timedelta(
        minutes=expires_minutes or Config.PASSWORD_RESET_EXPIRES_MINUTES
    )
    token_hash = hash_reset_token(token)
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = %s AND used = FALSE",
            (user_id,),
        )
        cursor.execute(
            """
            INSERT INTO password_reset_tokens (user_id, token, expires_at)
            VALUES (%s, %s, %s)
            """,
            (user_id, token_hash, expires_at),
        )
        connection.commit()
        return cursor.lastrowid
    finally:
        cursor.close()
        connection.close()


def verify_password_reset_token(token):
    token_hash = hash_reset_token(token)
    return _fetch_one(
        """
        SELECT prt.*, u.email
        FROM password_reset_tokens prt
        JOIN users u ON u.id = prt.user_id
        WHERE prt.token = %s
          AND prt.used = FALSE
          AND prt.expires_at > UTC_TIMESTAMP()
          AND u.is_active = TRUE
        """,
        (token_hash,),
    )


def update_user_password(user_id, password_hash, reset_token=None):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (password_hash, user_id),
        )
        if reset_token:
            cursor.execute(
                "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = %s AND used = FALSE",
                (user_id,),
            )
        connection.commit()
        return cursor.rowcount
    finally:
        cursor.close()
        connection.close()


def save_prediction(
    user_id,
    input_type,
    image_filename=None,
    original_text=None,
    extracted_text=None,
    cleaned_text=None,
    prediction=None,
    confidence=None,
    model_name=None,
):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO prediction_history (
                user_id, input_type, image_filename, original_text,
                extracted_text, cleaned_text, prediction, confidence, model_name
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                input_type,
                image_filename,
                original_text,
                extracted_text,
                cleaned_text,
                prediction,
                confidence,
                model_name,
            ),
        )
        connection.commit()
        return cursor.lastrowid
    finally:
        cursor.close()
        connection.close()


def save_image_prediction_records(
    user_id,
    image_name,
    image_path,
    extracted_text=None,
    cleaned_text=None,
    prediction=None,
    confidence=None,
    model_name=None,
):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO uploaded_images (user_id, image_name, image_path)
            VALUES (%s, %s, %s)
            """,
            (user_id, image_name, image_path),
        )
        image_id = cursor.lastrowid

        cursor.execute(
            """
            INSERT INTO classification_results (
                user_id, image_id, extracted_text, cleaned_text,
                prediction_label, confidence_score
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                image_id,
                extracted_text,
                cleaned_text,
                prediction,
                confidence,
            ),
        )
        classification_result_id = cursor.lastrowid

        cursor.execute(
            """
            INSERT INTO prediction_history (
                user_id, input_type, image_filename, original_text,
                extracted_text, cleaned_text, prediction, confidence, model_name
            )
            VALUES (%s, 'image', %s, NULL, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                image_name,
                extracted_text,
                cleaned_text,
                prediction,
                confidence,
                model_name,
            ),
        )
        history_id = cursor.lastrowid

        connection.commit()
        return {
            "image_id": image_id,
            "classification_result_id": classification_result_id,
            "history_id": history_id,
        }
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


def get_user_history(user_id):
    connection = get_db_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, user_id, input_type, image_filename, original_text,
                   extracted_text, cleaned_text, prediction, confidence,
                   model_name, created_at
            FROM prediction_history
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,),
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        connection.close()


def get_all_prediction_history():
    connection = get_db_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, user_id, input_type, image_filename, original_text,
                   extracted_text, cleaned_text, prediction, confidence,
                   model_name, created_at
            FROM prediction_history
            ORDER BY created_at DESC
            """
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        connection.close()


def get_all_users():
    connection = get_db_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, full_name, email, profile_picture, role, is_active, created_at
            FROM users
            ORDER BY created_at DESC
            """
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        connection.close()


def update_user_role(user_id, role):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("UPDATE users SET role = %s WHERE id = %s", (role, user_id))
        connection.commit()
        return cursor.rowcount
    finally:
        cursor.close()
        connection.close()


def update_user(user_id, full_name, email, role, is_active, password_hash=None):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        if password_hash:
            cursor.execute(
                """
                UPDATE users
                SET full_name = %s, email = %s, role = %s, is_active = %s,
                    password_hash = %s
                WHERE id = %s
                """,
                (full_name, email.lower(), role, is_active, password_hash, user_id),
            )
        else:
            cursor.execute(
                """
                UPDATE users
                SET full_name = %s, email = %s, role = %s, is_active = %s
                WHERE id = %s
                """,
                (full_name, email.lower(), role, is_active, user_id),
            )
        connection.commit()
        return cursor.rowcount
    finally:
        cursor.close()
        connection.close()


def update_user_profile_picture(user_id, profile_picture):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            "UPDATE users SET profile_picture = %s WHERE id = %s",
            (profile_picture, user_id),
        )
        connection.commit()
        return cursor.rowcount
    finally:
        cursor.close()
        connection.close()


def deactivate_user(user_id):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("UPDATE users SET is_active = FALSE WHERE id = %s", (user_id,))
        connection.commit()
        return cursor.rowcount
    finally:
        cursor.close()
        connection.close()


def delete_user_permanently(user_id):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        connection.commit()
        return cursor.rowcount
    finally:
        cursor.close()
        connection.close()


def is_duplicate_email_error(error):
    return isinstance(error, Error) and getattr(error, "errno", None) == 1062
