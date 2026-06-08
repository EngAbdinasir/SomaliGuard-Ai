import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent

load_dotenv(BASE_DIR / ".env")


class Config:
    APP_ENV = os.getenv("APP_ENV", os.getenv("FLASK_ENV", "development")).lower()
    IS_PRODUCTION = APP_ENV in {"production", "prod"}

    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "somali_offensive_detection")
    DB_UNIX_SOCKET = os.getenv("DB_UNIX_SOCKET", "")

    JWT_SECRET = os.getenv("JWT_SECRET", "change-this-dev-secret")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRES_HOURS = int(os.getenv("JWT_EXPIRES_HOURS", "24"))
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

    UPLOAD_FOLDER = Path(os.getenv("UPLOAD_FOLDER", BASE_DIR / "uploads"))
    ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", str(10 * 1024 * 1024)))
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_ENABLED = os.getenv("RATELIMIT_ENABLED", "true").lower() in {"1", "true", "yes"}

    PASSWORD_RESET_EXPIRES_MINUTES = int(os.getenv("PASSWORD_RESET_EXPIRES_MINUTES", "15"))
    EMAIL_VERIFICATION_EXPIRES_MINUTES = int(os.getenv("EMAIL_VERIFICATION_EXPIRES_MINUTES", "10"))
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")
    CORS_ORIGINS = list(
        dict.fromkeys(
            origin.strip()
            for origin in os.getenv(
                "CORS_ORIGINS",
                f"{FRONTEND_URL},http://localhost:5173,http://127.0.0.1:5173",
            ).split(",")
            if origin.strip()
        )
    )
    MODEL_REVIEW_CONFIDENCE_THRESHOLD = float(os.getenv("MODEL_REVIEW_CONFIDENCE_THRESHOLD", "0.65"))
    FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
    FLASK_PORT = int(os.getenv("FLASK_PORT", os.getenv("PORT", "5000")))

    MAIN_ADMIN_EMAIL = os.getenv("MAIN_ADMIN_EMAIL", "fiaa89013292@gmail.com")
    CONTACT_TO_EMAIL = os.getenv("CONTACT_TO_EMAIL", MAIN_ADMIN_EMAIL)
    BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
    BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", os.getenv("SMTP_USER", ""))
    BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "SomaliGuard AI")
    SMTP_HOST = os.getenv("SMTP_HOST", "")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in {"1", "true", "yes"}


if Config.IS_PRODUCTION:
    missing = [
        name
        for name in ("JWT_SECRET", "DB_PASSWORD")
        if not os.getenv(name)
    ]
    if not Config.BREVO_API_KEY and not (
        Config.SMTP_HOST and Config.SMTP_USER and Config.SMTP_PASSWORD
    ):
        missing.append("BREVO_API_KEY or SMTP configuration")
    if Config.JWT_SECRET == "change-this-dev-secret":
        missing.append("JWT_SECRET")
    if missing:
        raise RuntimeError(
            "Missing required production environment variables: "
            + ", ".join(sorted(set(missing)))
        )
