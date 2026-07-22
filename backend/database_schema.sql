-- Run this schema while connected to the database configured by DB_NAME.

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  profile_picture VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_reset_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prediction_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  input_type VARCHAR(20) NOT NULL,
  image_filename VARCHAR(255),
  original_text TEXT,
  extracted_text TEXT,
  cleaned_text TEXT,
  prediction VARCHAR(50),
  confidence FLOAT,
  model_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_prediction_history_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS classification_results (
  result_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  input_type VARCHAR(20) NOT NULL,
  image_filename VARCHAR(255),
  image_path VARCHAR(255),
  original_text TEXT,
  extracted_text TEXT,
  cleaned_text TEXT,
  prediction_label VARCHAR(50) NOT NULL,
  confidence_score FLOAT,
  model_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_classification_results_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_prediction_history_user_created
  ON prediction_history(user_id, created_at);

CREATE INDEX idx_prediction_history_created
  ON prediction_history(created_at);

CREATE INDEX idx_users_role_active
  ON users(role, is_active);

CREATE INDEX idx_email_verification_email_used_expires
  ON email_verification_codes(email, used, expires_at);

CREATE INDEX idx_classification_results_user_created
  ON classification_results(user_id, created_at);

CREATE INDEX idx_classification_results_input_created
  ON classification_results(input_type, created_at);
