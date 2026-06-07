from datetime import datetime, timedelta, UTC
from functools import wraps

import bcrypt
import jwt
from flask import jsonify, request

from config import Config
from database import find_user_by_id


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password, password_hash):
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def generate_token(user):
    now = datetime.now(UTC)
    payload = {
        "sub": str(user["id"]),
        "email": user["email"],
        "role": user.get("role", "user"),
        "exp": now + timedelta(hours=Config.JWT_EXPIRES_HOURS),
        "iat": now,
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)


def decode_token(token):
    return jwt.decode(token, Config.JWT_SECRET, algorithms=[Config.JWT_ALGORITHM])


def _bearer_token():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    return auth_header.split(" ", 1)[1].strip()


def get_current_user_optional():
    token = _bearer_token()
    if not token:
        return None
    try:
        payload = decode_token(token)
        user = find_user_by_id(payload["sub"])
        if user and user.get("is_active"):
            return user
    except Exception:
        return None
    return None


def jwt_required(route):
    @wraps(route)
    def wrapper(*args, **kwargs):
        token = _bearer_token()
        if not token:
            return jsonify({"error": "Authorization token is required."}), 401
        try:
            payload = decode_token(token)
            user = find_user_by_id(payload["sub"])
            if not user or not user.get("is_active"):
                return jsonify({"error": "User not found or inactive."}), 401
            request.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token."}), 401
        except Exception:
            return jsonify({"error": "Authentication failed."}), 401
        return route(*args, **kwargs)

    return wrapper
