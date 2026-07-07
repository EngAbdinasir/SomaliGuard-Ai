from secrets import randbelow, token_urlsafe
import smtplib
import re
from functools import wraps
import json
from urllib.parse import quote
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import uuid4
from email.message import EmailMessage

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from PIL import Image, UnidentifiedImageError
from werkzeug.utils import secure_filename

from auth import (
    generate_token,
    get_current_user_optional,
    hash_password,
    jwt_required,
    verify_password,
)
from config import Config
from database import (
    create_password_reset_token,
    create_email_verification_code,
    create_user,
    deactivate_user,
    ensure_database_indexes,
    ensure_email_verification_table,
    ensure_user_profile_picture_column,
    get_all_prediction_history,
    find_user_by_email,
    find_user_by_id,
    get_all_users,
    get_user_history,
    is_duplicate_email_error,
    mark_email_verification_code_used,
    save_image_prediction_records,
    save_prediction,
    update_user,
    update_user_profile_picture,
    update_user_role,
    update_user_password,
    verify_email_verification_code,
    verify_password_reset_token,
)
from inference import (
    extract_text_from_image,
    ocr_text_is_too_large,
    predict_image,
    predict_text,
    preprocess_somali_text,
)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = Config.MAX_CONTENT_LENGTH
CORS(app, resources={r"/*": {"origins": Config.CORS_ORIGINS}})

UPLOAD_DIR = Config.UPLOAD_FOLDER
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PROFILE_PICTURE_DIR = UPLOAD_DIR / "profile_pictures"
PROFILE_PICTURE_DIR.mkdir(parents=True, exist_ok=True)
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
RESET_GENERIC_MESSAGE = "If this email exists, we sent a password reset link."
REVIEW_EXEMPT_PREDICTIONS = {"unknown", "no_text_detected", "too_much_text_detected", "no_somali_text_detected", "needs_review"}
app.config["RATELIMIT_STORAGE_URI"] = Config.RATELIMIT_STORAGE_URI
app.config["RATELIMIT_ENABLED"] = Config.RATELIMIT_ENABLED
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    storage_uri=Config.RATELIMIT_STORAGE_URI,
    default_limits=[],
)

try:
    ensure_user_profile_picture_column()
    ensure_email_verification_table()
    ensure_database_indexes()
except Exception as exc:
    print(f"Warning: could not verify database migrations: {exc}")


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_IMAGE_EXTENSIONS


def is_valid_email(email):
    return bool(EMAIL_PATTERN.match(email or ""))


def validate_image_upload(file):
    try:
        image = Image.open(file.stream)
        image.verify()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValueError("Uploaded file is not a valid image.") from exc
    finally:
        file.stream.seek(0)


def rate_limit(max_requests, window_seconds):
    return limiter.limit(f"{max_requests} per {window_seconds} seconds")


def profile_picture_url(filename):
    if not filename:
        return None
    safe_name = secure_filename(str(filename).split("/")[-1])
    return f"{request.host_url.rstrip('/')}/uploads/profile_pictures/{safe_name}"


def public_user(user):
    return {
        "id": user["id"],
        "full_name": user["full_name"],
        "email": user["email"],
        "profile_picture": user.get("profile_picture"),
        "profile_picture_url": profile_picture_url(user.get("profile_picture")),
        "role": user.get("role", "user"),
        "is_active": bool(user.get("is_active", True)),
        "created_at": user["created_at"].isoformat() if user.get("created_at") else None,
    }


def save_profile_picture_file(file, user_id):
    if file.filename == "":
        return None

    if not allowed_file(file.filename):
        raise ValueError("Unsupported profile picture type. Use png, jpg, jpeg, or webp.")

    validate_image_upload(file)
    original_filename = secure_filename(file.filename)
    extension = original_filename.rsplit(".", 1)[1].lower()
    filename = f"{uuid4().hex}.{extension}"
    image_path = PROFILE_PICTURE_DIR / filename
    file.save(image_path)
    update_user_profile_picture(user_id, filename)
    return filename


def normalize_result_for_history(result):
    confidence = result.get("confidence")
    return {
        "cleaned_text": result.get("cleaned_text"),
        "prediction": result.get("prediction"),
        "confidence": float(confidence) if confidence is not None else None,
        "model_name": result.get("model_name"),
    }


def apply_review_threshold(result):
    prediction = str(result.get("prediction") or "").lower()
    confidence = float(result.get("confidence") or 0)

    if prediction not in REVIEW_EXEMPT_PREDICTIONS and confidence < Config.MODEL_REVIEW_CONFIDENCE_THRESHOLD:
        result["original_prediction"] = result.get("prediction")
        result["prediction"] = "needs_review"
        result["review_reason"] = "low_confidence"
        result["review_threshold"] = Config.MODEL_REVIEW_CONFIDENCE_THRESHOLD

    return result


def attach_history(result, user, input_type, **kwargs):
    try:
        history_data = normalize_result_for_history(result)
        history_id = save_prediction(
            user_id=user["id"] if user else None,
            input_type=input_type,
            cleaned_text=history_data["cleaned_text"],
            prediction=history_data["prediction"],
            confidence=history_data["confidence"],
            model_name=history_data["model_name"],
            **kwargs,
        )
        result["history_id"] = history_id
    except Exception as exc:
        result["history_id"] = None
        result["history_warning"] = f"Prediction completed, but history was not saved: {exc}"

    return result


def attach_image_records(result, user, filename, image_path):
    history_data = normalize_result_for_history(result)

    if not user:
        return attach_history(
            result,
            user,
            input_type="image",
            image_filename=filename,
            original_text=None,
            extracted_text=result.get("extracted_text"),
        )

    try:
        record_ids = save_image_prediction_records(
            user_id=user["id"],
            image_name=filename,
            image_path=str(image_path),
            extracted_text=result.get("extracted_text"),
            cleaned_text=history_data["cleaned_text"],
            prediction=history_data["prediction"],
            confidence=history_data["confidence"],
            model_name=history_data["model_name"],
        )
        result.update(record_ids)
    except Exception as exc:
        result["history_id"] = None
        result["image_id"] = None
        result["classification_result_id"] = None
        result["history_warning"] = f"Prediction completed, but image records were not saved: {exc}"

    return result


def format_history_row(row):
    return {
        **row,
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
    }


def text_stats(value):
    value = value or ""
    stripped = value.strip()
    return {
        "characters": len(value),
        "words": len(stripped.split()) if stripped else 0,
        "lines": len(value.splitlines()) if value else 0,
    }


def admin_required(route):
    @wraps(route)
    def wrapper(*args, **kwargs):
        if request.current_user.get("role") != "admin":
            return jsonify({"error": "Admin access is required."}), 403
        return route(*args, **kwargs)

    return wrapper


def user_payload():
    data = request.get_json(silent=True) or {}
    full_name = (data.get("full_name") or data.get("fullName") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = (data.get("role") or "user").strip().lower()
    is_active = data.get("is_active", data.get("isActive", True))

    if isinstance(is_active, str):
        is_active = is_active.lower() in {"1", "true", "yes", "active"}

    return full_name, email, password, role, bool(is_active)


def validate_user_payload(full_name, email, role, password="", require_password=False):
    if not full_name or not email:
        return "full_name and email are required."
    if not is_valid_email(email):
        return "A valid email address is required."
    if role not in {"user", "admin"}:
        return "role must be user or admin."
    if require_password and not password:
        return "password is required."
    if password and len(password) < 6:
        return "Password must be at least 6 characters."
    return None


def validate_account_password(password, confirm_password=None):
    if len(password or "") < 8:
        return "Password must be at least 8 characters."
    if not re.search(r"[A-Z]", password):
        return "Password must include at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return "Password must include at least one lowercase letter."
    if not re.search(r"[\d\W_]", password):
        return "Password must include at least one number or symbol."
    if confirm_password is not None and password != confirm_password:
        return "New password and confirm password must match."
    return None


def send_email(to_email, subject, content, reply_to=None):
    if Config.BREVO_API_KEY:
        sender_email = Config.BREVO_SENDER_EMAIL or Config.SMTP_USER
        if not sender_email:
            raise RuntimeError("Set BREVO_SENDER_EMAIL when using BREVO_API_KEY.")

        payload = {
            "sender": {"name": Config.BREVO_SENDER_NAME, "email": sender_email},
            "to": [{"email": to_email}],
            "subject": subject,
            "textContent": content,
        }
        if reply_to:
            payload["replyTo"] = {"email": reply_to}

        request_data = Request(
            "https://api.brevo.com/v3/smtp/email",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "accept": "application/json",
                "api-key": Config.BREVO_API_KEY,
                "content-type": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request_data, timeout=20):
                return
        except HTTPError as exc:
            response_body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Brevo email API returned HTTP {exc.code}: {response_body}") from exc
        except URLError as exc:
            raise RuntimeError(f"Brevo email API could not be reached: {exc.reason}") from exc

    if not Config.SMTP_HOST or not Config.SMTP_USER or not Config.SMTP_PASSWORD:
        raise RuntimeError("Email sending is not configured. Set BREVO_API_KEY or SMTP settings.")

    email_message = EmailMessage()
    email_message["Subject"] = subject
    email_message["From"] = Config.SMTP_USER
    email_message["To"] = to_email
    if reply_to:
        email_message["Reply-To"] = reply_to
    email_message.set_content(content)

    with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT, timeout=20) as server:
        if Config.SMTP_USE_TLS:
            server.starttls()
        server.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
        server.send_message(email_message)


def send_contact_email(name, sender_email, subject, message):
    send_email(
        Config.CONTACT_TO_EMAIL,
        f"SomaliGuard AI Contact: {subject}",
        "\n".join([
            "New SomaliGuard AI contact message",
            "",
            f"Name: {name}",
            f"Email: {sender_email}",
            f"Subject: {subject}",
            "",
            "Message:",
            message,
        ]),
        reply_to=sender_email,
    )


def send_password_reset_email(user_email, reset_token):
    reset_link = f"{Config.FRONTEND_URL.rstrip('/')}/reset-password?token={quote(reset_token)}"
    send_email(
        user_email,
        "Reset your SomaliGuard AI password",
        "\n".join([
            "We received a request to reset your SomaliGuard AI password.",
            "",
            "Open this link to choose a new password:",
            reset_link,
            "",
            f"This token expires in {Config.PASSWORD_RESET_EXPIRES_MINUTES} minutes.",
            "If you did not request this password reset, you can ignore this email.",
        ]),
    )


def send_email_verification_code(user_email, verification_code):
    send_email(
        user_email,
        "Verify your SomaliGuard AI email",
        "\n".join([
            "Welcome to SomaliGuard AI.",
            "",
            "Use this verification code to finish creating your account:",
            verification_code,
            "",
            f"This code expires in {Config.EMAIL_VERIFICATION_EXPIRES_MINUTES} minutes.",
            "If you did not request this code, you can ignore this email.",
        ]),
    )


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Somali Offensive Text Detection API is running.",
        "model": "SomBERTa",
        "ocr": "EasyOCR",
        "endpoints": [
            "/preprocess-text",
            "/extract-image-text",
            "/predict-text",
            "/predict-image",
            "/register",
            "/send-verification-code",
            "/login",
            "/forgot-password",
            "/reset-password",
            "/profile",
            "/history",
        ]
    })


@app.route("/contact", methods=["POST"])
@rate_limit(max_requests=5, window_seconds=300)
def contact_message():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    sender_email = (data.get("email") or "").strip()
    subject = (data.get("subject") or "").strip()
    message = (data.get("message") or "").strip()

    if not name or not sender_email or not subject or not message:
        return jsonify({"error": "name, email, subject, and message are required."}), 400
    if not is_valid_email(sender_email):
        return jsonify({"error": "A valid email address is required."}), 400

    try:
        send_contact_email(name, sender_email, subject, message)
        return jsonify({"message": "Thanks, your message has been sent. We will reply soon."})
    except Exception as exc:
        return jsonify({"error": f"Message could not be sent: {exc}"}), 500


@app.route("/send-verification-code", methods=["POST"])
@rate_limit(max_requests=5, window_seconds=300)
def send_verification_code():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "email is required."}), 400
    if not is_valid_email(email):
        return jsonify({"error": "A valid email address is required."}), 400

    try:
        if find_user_by_email(email):
            return jsonify({"error": "This email is taken."}), 409

        verification_code = f"{randbelow(1000000):06d}"
        create_email_verification_code(email, verification_code)
        send_email_verification_code(email, verification_code)
        return jsonify({"message": "We sent a verification code. Check your Inbox and Spam folder."})
    except Exception as exc:
        return jsonify({"error": f"Verification code could not be sent: {exc}"}), 500


@app.route("/register", methods=["POST"])
@rate_limit(max_requests=8, window_seconds=300)
def register():
    data = request.form if request.form else (request.get_json(silent=True) or {})
    full_name = (data.get("full_name") or data.get("fullName") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    verification_code = (data.get("verification_code") or data.get("verificationCode") or "").strip()
    profile_picture = request.files.get("profile_picture")

    if not full_name or not email or not password:
        return jsonify({"error": "full_name, email, and password are required."}), 400
    if not is_valid_email(email):
        return jsonify({"error": "A valid email address is required."}), 400
    password_error = validate_account_password(password)
    if password_error:
        return jsonify({"error": password_error}), 400
    if not verification_code:
        return jsonify({"error": "verification_code is required."}), 400
    if not verification_code.isdigit() or len(verification_code) != 6:
        return jsonify({"error": "verification_code must be exactly 6 digits."}), 400

    try:
        verification_record = verify_email_verification_code(email, verification_code)
        if not verification_record:
            return jsonify({"error": "Invalid or expired verification code."}), 400

        password_hash = hash_password(password)
        user_id = create_user(full_name, email, password_hash, role="user")
        mark_email_verification_code_used(verification_record["id"])
        profile_picture_filename = None
        if profile_picture:
            profile_picture_filename = save_profile_picture_file(profile_picture, user_id)
        user = {
            "id": user_id,
            "full_name": full_name,
            "email": email,
            "profile_picture": profile_picture_filename,
            "role": "user",
            "is_active": True,
            "created_at": None,
        }
        token = generate_token(user)
        return jsonify({"message": "Registration successful.", "token": token, "user": public_user(user)}), 201
    except Exception as exc:
        if is_duplicate_email_error(exc):
            return jsonify({"error": "This email is taken."}), 409
        return jsonify({"error": f"Registration failed: {exc}"}), 500


@app.route("/login", methods=["POST"])
@rate_limit(max_requests=10, window_seconds=300)
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email and password are required."}), 400
    if not is_valid_email(email):
        return jsonify({"error": "A valid email address is required."}), 400

    try:
        user = find_user_by_email(email)
        if not user or not user.get("is_active") or not verify_password(password, user["password_hash"]):
            return jsonify({"error": "Invalid email or password."}), 401

        token = generate_token(user)
        return jsonify({"message": "Login successful.", "token": token, "user": public_user(user)})
    except Exception as exc:
        return jsonify({"error": f"Login failed: {exc}"}), 500


@app.route("/auth/google", methods=["POST"])
@rate_limit(max_requests=10, window_seconds=300)
def google_auth():
    data = request.get_json(silent=True) or {}
    credential = (data.get("credential") or "").strip()

    if not Config.GOOGLE_CLIENT_ID:
        return jsonify({"error": "Google sign-in is not configured."}), 503
    if not credential:
        return jsonify({"error": "Google credential is required."}), 400

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token

        google_user = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            Config.GOOGLE_CLIENT_ID,
        )

        if not google_user.get("email_verified"):
            return jsonify({"error": "Google email is not verified."}), 401

        email = (google_user.get("email") or "").strip().lower()
        full_name = (google_user.get("name") or email.split("@")[0]).strip()
        if not is_valid_email(email):
            return jsonify({"error": "Google account did not provide a valid email."}), 400

        user = find_user_by_email(email)
        if user and not user.get("is_active"):
            return jsonify({"error": "User not found or inactive."}), 401

        if not user:
            password_hash = hash_password(token_urlsafe(32))
            user_id = create_user(full_name, email, password_hash, role="user")
            user = find_user_by_id(user_id)

        token = generate_token(user)
        return jsonify({"message": "Google sign-in successful.", "token": token, "user": public_user(user)})
    except ValueError:
        return jsonify({"error": "Invalid Google credential."}), 401
    except Exception as exc:
        return jsonify({"error": f"Google sign-in failed: {exc}"}), 500


@app.route("/forgot-password", methods=["POST"])
@rate_limit(max_requests=5, window_seconds=300)
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "email is required."}), 400
    if not is_valid_email(email):
        return jsonify({"error": "A valid email address is required."}), 400

    try:
        user = find_user_by_email(email)
        if not user or not user.get("is_active"):
            return jsonify({"message": RESET_GENERIC_MESSAGE})

        reset_token = token_urlsafe(32)
        create_password_reset_token(user["id"], reset_token)

        if Config.BREVO_API_KEY or (
            Config.SMTP_HOST and Config.SMTP_USER and Config.SMTP_PASSWORD
        ):
            send_password_reset_email(user["email"], reset_token)
        elif Config.IS_PRODUCTION:
            raise RuntimeError("Password reset email is not configured.")
        else:
            print(f"Development password reset link: {Config.FRONTEND_URL.rstrip('/')}/reset-password?token={reset_token}")

        return jsonify({"message": RESET_GENERIC_MESSAGE})
    except Exception as exc:
        print(f"Password reset request failed: {exc}")
        return jsonify({"message": RESET_GENERIC_MESSAGE})


@app.route("/reset-password", methods=["POST"])
@rate_limit(max_requests=8, window_seconds=300)
def reset_password():
    data = request.get_json(silent=True) or {}
    reset_token = (data.get("token") or "").strip()
    new_password = data.get("new_password") or data.get("newPassword") or ""
    confirm_password = data.get("confirm_password") or data.get("confirmPassword")

    if not reset_token or not new_password or confirm_password is None:
        return jsonify({"error": "token, new_password, and confirm_password are required."}), 400
    validation_error = validate_account_password(new_password, confirm_password)
    if validation_error:
        return jsonify({"error": validation_error}), 400

    try:
        reset_record = verify_password_reset_token(reset_token)
        if not reset_record:
            return jsonify({"error": "Invalid or expired reset token."}), 400

        update_user_password(reset_record["user_id"], hash_password(new_password), reset_token)
        return jsonify({"message": "Password reset successful."})
    except Exception as exc:
        return jsonify({"error": f"Password reset failed: {exc}"}), 500


@app.route("/profile", methods=["GET"])
@jwt_required
def profile():
    return jsonify({"user": public_user(request.current_user)})


@app.route("/uploads/profile_pictures/<filename>", methods=["GET"])
def uploaded_profile_picture(filename):
    return send_from_directory(PROFILE_PICTURE_DIR, secure_filename(filename))


@app.route("/profile-picture", methods=["POST"])
@rate_limit(max_requests=10, window_seconds=300)
@jwt_required
def upload_profile_picture():
    if "profile_picture" not in request.files:
        return jsonify({"error": "Please upload an image using field name 'profile_picture'."}), 400

    file = request.files["profile_picture"]

    if file.filename == "":
        return jsonify({"error": "No selected image file."}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type. Use png, jpg, jpeg, or webp."}), 400

    try:
        save_profile_picture_file(file, request.current_user["id"])
        user = find_user_by_id(request.current_user["id"])
        return jsonify({
            "message": "Profile picture updated successfully.",
            "user": public_user(user),
        })
    except Exception as exc:
        return jsonify({"error": f"Could not update profile picture: {exc}"}), 500


@app.route("/history", methods=["GET"])
@jwt_required
def history():
    try:
        rows = get_user_history(request.current_user["id"])
        return jsonify({"history": [format_history_row(row) for row in rows]})
    except Exception as exc:
        return jsonify({"error": f"Could not load history: {exc}"}), 500


@app.route("/admin/dashboard", methods=["GET"])
@jwt_required
@admin_required
def admin_dashboard():
    try:
        rows = get_all_prediction_history()
        users = get_all_users()
        active_users = [user for user in users if user.get("is_active")]
        admin_users = [user for user in users if user.get("role") == "admin"]
        return jsonify({
            "history": [format_history_row(row) for row in rows],
            "users": [public_user(user) for user in users],
            "users_count": len(users),
            "active_users_count": len(active_users),
            "inactive_users_count": len(users) - len(active_users),
            "admin_users_count": len(admin_users),
            "regular_users_count": len(users) - len(admin_users),
            "model_name": "SomBERTa",
            "database_status": "Connected",
        })
    except Exception as exc:
        return jsonify({"error": f"Could not load dashboard data: {exc}"}), 500


@app.route("/users", methods=["GET"])
@jwt_required
@admin_required
def users():
    try:
        return jsonify({"users": [public_user(user) for user in get_all_users()]})
    except Exception as exc:
        return jsonify({"error": f"Could not load users: {exc}"}), 500


@app.route("/users", methods=["POST"])
@jwt_required
@admin_required
def create_user_admin():
    full_name, email, password, role, is_active = user_payload()
    validation_error = validate_user_payload(
        full_name,
        email,
        role,
        password=password,
        require_password=True,
    )
    if validation_error:
        return jsonify({"error": validation_error}), 400

    try:
        user_id = create_user(full_name, email, hash_password(password), role=role)
        if not is_active:
            deactivate_user(user_id)
        user = {
            "id": user_id,
            "full_name": full_name,
            "email": email,
            "profile_picture": None,
            "role": role,
            "is_active": is_active,
            "created_at": None,
        }
        return jsonify({"message": "User created.", "user": public_user(user)}), 201
    except Exception as exc:
        if is_duplicate_email_error(exc):
            return jsonify({"error": "This email is taken."}), 409
        return jsonify({"error": f"Could not create user: {exc}"}), 500


@app.route("/users/<int:user_id>", methods=["PUT"])
@jwt_required
@admin_required
def edit_user(user_id):
    existing_user = next((user for user in get_all_users() if user["id"] == user_id), None)
    if not existing_user:
        return jsonify({"error": "User not found."}), 404

    full_name, email, password, role, is_active = user_payload()
    validation_error = validate_user_payload(full_name, email, role, password=password)
    if validation_error:
        return jsonify({"error": validation_error}), 400

    if user_id == request.current_user["id"]:
        role = request.current_user.get("role", "admin")
        is_active = True

    try:
        password_hash = hash_password(password) if password else None
        update_user(user_id, full_name, email, role, is_active, password_hash=password_hash)
        updated_user = {
            "id": user_id,
            "full_name": full_name,
            "email": email,
            "profile_picture": existing_user.get("profile_picture"),
            "role": role,
            "is_active": is_active,
            "created_at": existing_user.get("created_at"),
        }
        return jsonify({"message": "User updated.", "user": public_user(updated_user)})
    except Exception as exc:
        if is_duplicate_email_error(exc):
            return jsonify({"error": "This email is taken."}), 409
        return jsonify({"error": f"Could not update user: {exc}"}), 500


@app.route("/users/<int:user_id>/role", methods=["PATCH"])
@jwt_required
@admin_required
def change_user_role(user_id):
    if user_id == request.current_user["id"]:
        return jsonify({"error": "You cannot change your own role."}), 400

    data = request.get_json(silent=True) or {}
    role = (data.get("role") or "").strip().lower()
    if role not in {"user", "admin"}:
        return jsonify({"error": "role must be user or admin."}), 400

    try:
        if update_user_role(user_id, role) == 0:
            return jsonify({"error": "User not found."}), 404
        return jsonify({"message": "User role updated."})
    except Exception as exc:
        return jsonify({"error": f"Could not update role: {exc}"}), 500


@app.route("/users/<int:user_id>", methods=["DELETE"])
@jwt_required
@admin_required
def deactivate_user_route(user_id):
    if user_id == request.current_user["id"]:
        return jsonify({"error": "You cannot deactivate your own account."}), 400

    try:
        if deactivate_user(user_id) == 0:
            return jsonify({"error": "User not found."}), 404
        return jsonify({"message": "User deactivated."})
    except Exception as exc:
        return jsonify({"error": f"Could not deactivate user: {exc}"}), 500


@app.route("/preprocess-text", methods=["POST"])
@rate_limit(max_requests=30, window_seconds=300)
@jwt_required
def preprocess_text_route():
    data = request.get_json(silent=True) or {}

    if not data or "text" not in data:
        return jsonify({"error": "Please provide a text field."}), 400

    text = data.get("text", "")
    if not text.strip():
        return jsonify({"error": "Please enter Somali text before preprocessing."}), 400

    try:
        cleaned_text = preprocess_somali_text(text)
        return jsonify({
            "original_text": text,
            "cleaned_text": cleaned_text,
            "original_stats": text_stats(text),
            "cleaned_stats": text_stats(cleaned_text),
        })
    except Exception as exc:
        return jsonify({"error": f"Text preprocessing failed: {exc}"}), 500


@app.route("/predict-text", methods=["POST"])
@rate_limit(max_requests=30, window_seconds=300)
@jwt_required
def predict_text_route():
    data = request.get_json(silent=True) or {}

    if not data or "text" not in data:
        return jsonify({"error": "Please provide a text field."}), 400

    try:
        text = data.get("text", "")
        result = apply_review_threshold(predict_text(text))
        user = request.current_user
        result = attach_history(
            result,
            user,
            input_type="text",
            original_text=text,
        )
        return jsonify(result)
    except Exception as exc:
        return jsonify({"error": f"Text prediction failed: {exc}"}), 500


@app.route("/extract-image-text", methods=["POST"])
@rate_limit(max_requests=12, window_seconds=300)
@jwt_required
def extract_image_text_route():
    if "image" not in request.files:
        return jsonify({"error": "Please upload an image using field name 'image'."}), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({"error": "No selected image file."}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type. Use png, jpg, jpeg, or webp."}), 400

    try:
        validate_image_upload(file)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    original_filename = secure_filename(file.filename)
    filename = f"{uuid4().hex}_{original_filename}"
    image_path = UPLOAD_DIR / filename

    try:
        file.save(image_path)
        extracted_text = extract_text_from_image(image_path)
        cleaned_text = preprocess_somali_text(extracted_text)
        too_much_text = ocr_text_is_too_large(cleaned_text)
        return jsonify({
            "image_filename": original_filename,
            "extracted_text": extracted_text,
            "cleaned_text": cleaned_text,
            "original_stats": text_stats(extracted_text),
            "cleaned_stats": text_stats(cleaned_text),
            "status": "too_much_text_detected" if too_much_text else "ready" if extracted_text else "no_text_detected",
        })
    except Exception as exc:
        return jsonify({"error": f"Image text extraction failed: {exc}"}), 500
    finally:
        try:
            image_path.unlink(missing_ok=True)
        except OSError:
            pass


@app.route("/predict-image", methods=["POST"])
@rate_limit(max_requests=12, window_seconds=300)
@jwt_required
def predict_image_route():
    if "image" not in request.files:
        return jsonify({"error": "Please upload an image using field name 'image'."}), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({"error": "No selected image file."}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type. Use png, jpg, jpeg, or webp."}), 400

    try:
        validate_image_upload(file)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    original_filename = secure_filename(file.filename)
    extension = original_filename.rsplit(".", 1)[1].lower()
    filename = f"{uuid4().hex}_{original_filename}"
    image_path = UPLOAD_DIR / filename

    try:
        file.save(image_path)
        result = apply_review_threshold(predict_image(image_path))
        user = request.current_user
        result = attach_image_records(
            result,
            user,
            filename,
            image_path,
        )
        return jsonify(result)
    except Exception as exc:
        return jsonify({"error": f"Image prediction failed: {exc}"}), 500


if __name__ == "__main__":
    app.run(
        host=Config.FLASK_HOST,
        port=Config.FLASK_PORT,
        debug=not Config.IS_PRODUCTION,
    )
