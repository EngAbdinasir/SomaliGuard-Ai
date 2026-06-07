import os


bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"
workers = 1
threads = int(os.getenv("GUNICORN_THREADS", "2"))
timeout = int(os.getenv("GUNICORN_TIMEOUT", "300"))
accesslog = "-"
errorlog = "-"

