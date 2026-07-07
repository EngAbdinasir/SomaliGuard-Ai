# SomaliGuard AI

SomaliGuard AI is a web-based system for detecting offensive Somali text from typed text and text extracted from images.

## Project Structure

```text
SomaliGuard-AI/
├── backend/          # Flask API, authentication, OCR, database, and prediction endpoints
├── frontend/         # React + Vite user interface
├── models/           # Current trained SomBERTa model and preprocessing files
├── docs/             # Project documentation and model comparison results
├── Dockerfile        # Backend Docker deployment file
├── DEPLOYMENT.md     # Local and deployment instructions
└── README.md         # Project overview
```

## Main Technologies

- Frontend: React, Vite, JavaScript, CSS.
- Backend: Python, Flask, Gunicorn.
- Machine learning: PyTorch, Transformers, SomBERTa.
- OCR: EasyOCR.
- Database: MySQL.

## How the Model Is Used

The backend receives text from the frontend through the `/predict-text` endpoint, or extracts text from uploaded images through EasyOCR and `/predict-image`.

Before prediction, the backend applies the same preprocessing used during training:

1. Lowercase the text.
2. Remove URLs, mentions, hashtags, numbers, punctuation, and non-Latin symbols.
3. Normalize repeated characters.
4. Keep meaningful Somali words because the SomBERTa model was trained without stopword removal.
5. Tokenize the cleaned text with the SomBERTa tokenizer.
6. Run the SomBERTa classifier.
7. Return the predicted label and confidence score.

The active model is stored in:

```text
models/active_model
```

The metadata and preprocessing files are:

```text
models/best_model_info.json
models/label_mapping.json
models/active_model/preprocessing_config.json
```

## Database

The database design is stored in:

```text
backend/database_schema.sql
```

This schema file defines the required MySQL tables for users, email verification codes, password reset tokens, prediction history, uploaded images, and classification results.

Local SQL database dumps are intentionally not committed to GitHub because they can contain private test users, prediction records, and other sensitive data.

## Run Locally

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the frontend URL shown by Vite and make sure `frontend/.env` points to the backend API.
