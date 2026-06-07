import re
import json
import os
import string
from pathlib import Path

import torch
import torch.nn.functional as F
from huggingface_hub import snapshot_download
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import easyocr

BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_DIR = BASE_DIR / "models"

with open(MODEL_DIR / "best_model_info.json", "r", encoding="utf-8") as f:
    BEST_INFO = json.load(f)

with open(MODEL_DIR / "label_mapping.json", "r", encoding="utf-8") as f:
    LABEL_MAPPING = {int(k): v for k, v in json.load(f).items()}

MAX_LEN = int(BEST_INFO.get("max_len", 128))
MODEL_PATH = Path(BEST_INFO["model_path"])


def model_files_exist(model_path):
    return model_path.exists() and any(
        (model_path / filename).exists()
        for filename in ("model.safetensors", "pytorch_model.bin")
    )


if not model_files_exist(MODEL_PATH):
    MODEL_PATH = MODEL_DIR / "transformer_models" / "mBERT_final"

if not model_files_exist(MODEL_PATH):
    model_repo_id = os.getenv("HF_MODEL_REPO_ID", "").strip()
    if not model_repo_id:
        raise FileNotFoundError(
            "Model weights were not found locally. Set HF_MODEL_REPO_ID for deployment."
        )
    MODEL_PATH = Path(
        snapshot_download(
            repo_id=model_repo_id,
            revision=os.getenv("HF_MODEL_REVISION", "main"),
            token=os.getenv("HF_TOKEN") or None,
        )
    )

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
model.to(device)
model.eval()

try:
    ocr_reader = easyocr.Reader(["en"], gpu=torch.cuda.is_available())
except Exception:
    ocr_reader = easyocr.Reader(["en"], gpu=False)


def remove_emojis_and_symbols(text):
    return str(text).encode("ascii", errors="ignore").decode("ascii")


def normalize_repeated_chars(text, max_repeat=2):
    return re.sub(r"(.)\1{" + str(max_repeat) + r",}", r"\1" * max_repeat, str(text))


def clean_somali_text(text):
    if text is None:
        return ""

    text = str(text).lower()
    text = re.sub(r"http\S+|www\S+", " ", text)
    text = re.sub(r"@\w+", " ", text)
    text = re.sub(r"#", "", text)
    text = remove_emojis_and_symbols(text)
    text = normalize_repeated_chars(text)
    text = re.sub(r"\d+", " ", text)
    text = text.translate(str.maketrans("", "", string.punctuation))
    text = re.sub(r"[^a-z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    return text


MAX_IMAGE_OCR_WORDS = 90
MAX_IMAGE_OCR_CHARS = 900


def ocr_text_is_too_large(cleaned_text):
    words = re.findall(r"[a-z]+", cleaned_text or "")
    return len(words) > MAX_IMAGE_OCR_WORDS or len(cleaned_text or "") > MAX_IMAGE_OCR_CHARS


def extract_text_from_image(image_path, min_confidence=0.30):
    image_path = Path(image_path)

    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    result = ocr_reader.readtext(str(image_path))

    extracted_lines = []

    for bbox, text, confidence in result:
        if text and float(confidence) >= min_confidence:
            extracted_lines.append(text)

    return " ".join(extracted_lines).strip()


def predict_text(text):
    cleaned = clean_somali_text(text)

    if not cleaned:
        return {
            "original_text": text,
            "cleaned_text": "",
            "prediction": "unknown",
            "confidence": 0.0,
            "model_name": BEST_INFO.get("best_model_name", "mBERT")
        }

    inputs = tokenizer(
        cleaned,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=MAX_LEN
    )

    inputs = {key: value.to(device) for key, value in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)
        probabilities = F.softmax(outputs.logits, dim=1)

    pred_id = int(torch.argmax(probabilities, dim=1).item())
    confidence = float(probabilities[0][pred_id].item())

    return {
        "original_text": text,
        "cleaned_text": cleaned,
        "prediction": LABEL_MAPPING[pred_id],
        "confidence": round(confidence, 4),
        "model_name": BEST_INFO.get("best_model_name", "mBERT")
    }


def predict_image(image_path):
    extracted_text = extract_text_from_image(image_path)
    cleaned_text = clean_somali_text(extracted_text)

    if not extracted_text:
        return {
            "image_path": str(image_path),
            "extracted_text": "",
            "cleaned_text": "",
            "prediction": "no_text_detected",
            "confidence": 0.0,
            "model_name": BEST_INFO.get("best_model_name", "mBERT")
        }

    if ocr_text_is_too_large(cleaned_text):
        return {
            "image_path": str(image_path),
            "extracted_text": extracted_text,
            "cleaned_text": cleaned_text,
            "prediction": "too_much_text_detected",
            "confidence": 0.0,
            "model_name": BEST_INFO.get("best_model_name", "mBERT")
        }

    prediction = predict_text(extracted_text)

    return {
        "image_path": str(image_path),
        "extracted_text": extracted_text,
        "cleaned_text": prediction["cleaned_text"],
        "prediction": prediction["prediction"],
        "confidence": prediction["confidence"],
        "model_name": prediction["model_name"]
    }
