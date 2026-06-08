# SomaliGuard AI Deployment

Recommended setup:

- Frontend: Vercel
- Backend, MySQL, and persistent uploads: Railway
- Backend service root directory: `Models_and_backend`
- Backend volume mount path: `/data`

The backend includes a 678 MB mBERT model plus PyTorch and EasyOCR. Use a Railway
service with at least 4 GB RAM. The Gunicorn configuration intentionally uses one
worker so the model is loaded into memory only once.

## 1. Before Deploying

1. Push the project to a private GitHub repository.
2. Never commit either `.env` file.
3. Rotate any password that has previously been stored in a local `.env` file.
4. Create a long random production `JWT_SECRET`.
5. Create a Hugging Face model repository and upload the files from
   `Models_and_backend/models/transformer_models/mBERT_final`.

The 678 MB `model.safetensors` file is intentionally excluded from GitHub and
the Docker image because normal GitHub repositories reject files over 100 MB.
The backend downloads it from Hugging Face on its first online startup.

## 2. Deploy MySQL on Railway

1. Create a Railway project.
2. Add a MySQL database service.
3. Import `Models_and_backend/backend/database_schema.sql` into that database.

Railway exposes MySQL connection values such as `MYSQLHOST`, `MYSQLPORT`,
`MYSQLUSER`, `MYSQLPASSWORD`, and `MYSQLDATABASE`. Reference those values from
the backend variables below.

## 3. Deploy the Backend on Railway

1. Add a service from the GitHub repository.
2. Set the service root directory to `Models_and_backend`.
3. Railway will detect `Models_and_backend/Dockerfile`.
4. Add a public domain to the backend service.
5. Add a volume mounted at `/data`.
6. Set these service variables:

```env
APP_ENV=production
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
DB_UNIX_SOCKET=
JWT_SECRET=replace-with-a-long-random-production-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
UPLOAD_FOLDER=/data/uploads
HF_HOME=/data/huggingface
HF_MODEL_REPO_ID=your-hugging-face-username/your-model-repository
# Only set HF_TOKEN if the Hugging Face model repository is private.
HF_TOKEN=your-hugging-face-read-token
RATELIMIT_STORAGE_URI=memory://
RATELIMIT_ENABLED=true
MODEL_REVIEW_CONFIDENCE_THRESHOLD=0.65
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGINS=https://your-frontend.vercel.app
CONTACT_TO_EMAIL=your-email@example.com
# Recommended on Hugging Face Spaces because SMTP port 587 is blocked.
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=your-verified-brevo-sender@example.com
BREVO_SENDER_NAME=SomaliGuard AI
# SMTP can be used on hosts that allow outbound port 587.
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-new-gmail-app-password
SMTP_USE_TLS=true
```

Replace `MySQL` in Railway references if the database service has another name.
After deployment, open the backend domain. The root endpoint should return the
API status JSON.

## 4. Deploy the Frontend on Vercel

1. Import the same GitHub repository into Vercel.
2. Set the project root directory to `Front_end`.
3. Keep the detected Vite build settings.
4. Add these Vercel environment variables:

```env
VITE_API_BASE_URL=https://your-backend.up.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

5. Deploy the frontend.
6. Update the Railway backend variables `FRONTEND_URL` and `CORS_ORIGINS` with
   the final Vercel URL, then redeploy the backend.

## 5. Final Checks

- Register and verify a new account.
- Log in and run text prediction.
- Upload an image and confirm it remains available after a backend redeploy.
- Confirm password-reset links use the public frontend URL.
- Confirm `/history` and the admin dashboard load saved records.
