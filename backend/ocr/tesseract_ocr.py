"""
OCR module — Tesseract wrapper with Indian script detection and confidence scoring.

Install system dependencies first:
  sudo apt-get install -y tesseract-ocr tesseract-ocr-hin tesseract-ocr-kan \\
    tesseract-ocr-tam tesseract-ocr-tel tesseract-ocr-mal tesseract-ocr-ben tesseract-ocr-eng
"""

import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Script → Tesseract language code mapping
SCRIPT_LANG_MAP = {
    "Devanagari": "hin+mar+nep",
    "Kannada":    "kan",
    "Tamil":      "tam",
    "Telugu":     "tel",
    "Malayalam":  "mal",
    "Bengali":    "ben",
    "Latin":      "eng",
    "Han":        "chi_sim",
}

OCR_CONFIDENCE_THRESHOLD = 0.70  # Below this → ask user to retake photo


def _import_tesseract():
    """Lazy import so the app starts even if tesseract isn't installed yet."""
    try:
        import pytesseract
        from PIL import Image
        return pytesseract, Image
    except ImportError:
        raise ImportError(
            "pytesseract / Pillow not installed. Run: pip install pytesseract Pillow"
        )


def detect_script(image_path: str) -> str:
    """
    Use Tesseract OSD (Orientation and Script Detection) to identify the
    dominant script in an image.
    Returns a script name like 'Devanagari', 'Latin', 'Tamil', etc.
    """
    pytesseract, Image = _import_tesseract()
    try:
        osd = pytesseract.image_to_osd(Image.open(image_path), nice=1)
        for line in osd.split("\n"):
            if "Script:" in line:
                return line.split(":")[1].strip()
    except Exception as e:
        logger.warning(f"Script detection failed ({e}), defaulting to Latin")
    return "Latin"


def extract_text_from_image(image_path: str) -> dict:
    """
    Run Tesseract OCR on an image file.

    Returns:
        {
          "text": str,
          "confidence": float (0.0 – 1.0),
          "script": str,
          "language_code": str,
          "low_confidence": bool
        }
    """
    pytesseract, Image = _import_tesseract()
    image_path = str(image_path)

    # Detect script first to pick the right language pack
    script = detect_script(image_path)
    lang = SCRIPT_LANG_MAP.get(script, "eng")

    logger.info(f"OCR: detected script={script}, using lang={lang}")

    try:
        img = Image.open(image_path)

        # Get per-word confidence data
        data = pytesseract.image_to_data(
            img, lang=lang, output_type=pytesseract.Output.DICT
        )

        # Mean confidence ignoring -1 (no-text boxes)
        confidences = [c for c in data["conf"] if c != -1]
        mean_conf = (sum(confidences) / len(confidences) / 100) if confidences else 0.0

        # Full text extraction
        text = pytesseract.image_to_string(img, lang=lang)
        text = text.strip()

        return {
            "text": text,
            "confidence": round(mean_conf, 3),
            "script": script,
            "language_code": lang,
            "low_confidence": mean_conf < OCR_CONFIDENCE_THRESHOLD,
        }

    except Exception as e:
        logger.error(f"OCR extraction failed: {e}")
        return {
            "text": "",
            "confidence": 0.0,
            "script": script,
            "language_code": lang,
            "low_confidence": True,
            "error": str(e),
        }
