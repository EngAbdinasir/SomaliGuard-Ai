# Project Structure

The project is organized to separate the user interface, backend API, and trained model artifacts.

```text
SomaliGuard-AI/
├── backend/
│   ├── app.py                  # Flask routes and API entry point
│   ├── auth.py                 # Login, registration, verification, and password reset logic
│   ├── config.py               # Environment-based application configuration
│   ├── database.py             # MySQL connection helpers
│   ├── database_schema.sql     # Required MySQL database tables
│   ├── inference.py            # Text cleaning, OCR, model loading, and prediction
│   ├── requirements.txt        # Python dependencies
│   └── gunicorn.conf.py        # Production server configuration
├── frontend/
│   ├── src/                    # React source code
│   ├── public/                 # Static assets
│   ├── package.json            # JavaScript dependencies and scripts
│   └── vite.config.js          # Vite configuration
├── models/
│   ├── active_model/           # Active trained SomBERTa model files
│   │   ├── config.json
│   │   ├── model.safetensors
│   │   ├── tokenizer.json
│   │   ├── tokenizer_config.json
│   │   ├── preprocessing_config.json
│   │   ├── id2label.json
│   │   ├── label2id.json
│   │   └── training_args.bin
│   ├── best_model_info.json    # Best-model metadata and metrics
│   └── label_mapping.json      # Numeric class IDs to labels
├── docs/
│   ├── PROJECT_STRUCTURE.md
│   └── model_results/
│       └── all_model_results.csv
├── Dockerfile
├── DEPLOYMENT.md
└── README.md
```

Only one model folder is active: `models/active_model`. Old model exports, backup model folders, and temporary deployment folders are no longer part of the project.

The GitHub repository includes the database schema, not private local database dumps. Full SQL exports from phpMyAdmin may contain real users and prediction records, so they should stay local and are ignored by Git.
