# SomaliGuard AI Deployment Guide

SomaliGuard AI is organized as a full-stack machine learning system:

- `frontend/` - React and Vite web interface.
- `backend/` - Flask API for authentication, predictions, OCR, history, and email flows.
- `models/` - Current trained SomBERTa offensive-language classifier and preprocessing files.
- `Dockerfile` - Backend container configuration for Hugging Face Spaces or another Docker host.

## Backend

The backend loads the current model from:

```text
models/active_model
```

It also uses:

```text
models/label_mapping.json
models/best_model_info.json
models/active_model/preprocessing_config.json
```

The model was trained with Somali text cleaning without stopword removal, so keep the SomBERTa model folder and preprocessing file together.

Run locally:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

## Frontend

Run locally:

```bash
cd frontend
npm install
npm run dev
```

Set the local API URL in `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5001
```

## Environment Variables

Backend variables:

```env
APP_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-local-password
DB_NAME=somali_offensive_detection
DB_UNIX_SOCKET=
JWT_SECRET=replace-with-a-long-random-secret
UPLOAD_FOLDER=uploads
RATELIMIT_STORAGE_URI=memory://
RATELIMIT_ENABLED=true
MODEL_REVIEW_CONFIDENCE_THRESHOLD=0.65
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_USE_TLS=true
CONTACT_TO_EMAIL=your-email@gmail.com
```

## Database

Create the MySQL database and import:

```text
backend/database_schema.sql
```

The required tables include users, verification codes, password reset tokens, prediction history, uploaded images, and classification results.

## Deployment Notes

For Vercel, deploy only the frontend:

```text
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

For Hugging Face Spaces or a Docker host, deploy the backend using the root `Dockerfile`. The container copies `backend/` and `models/` into the image.

The model file `models/active_model/model.safetensors` is large. If pushing to GitHub or Hugging Face, use Git LFS or upload the model directly through Hugging Face.
