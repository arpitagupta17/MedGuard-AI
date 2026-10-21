"""
Reads a medicine image (raw bytes) with EasyOCR and returns the OCR lines
in the format medicine_parser.parse_medicine_text() expects.
"""
import logging
import time

import cv2
import numpy as np

logger = logging.getLogger("uvicorn.error")

# The longest side of the image is resized to this many pixels before reading.
# Smaller = faster but may miss tiny print. Try 1280 for speed, 1600 for detail.
MAX_SIDE = 1600

_reader = None


def get_reader():
    """Load EasyOCR once (it is slow to load), the first time it is needed."""
    global _reader
    if _reader is None:
        import easyocr
        started = time.time()
        _reader = easyocr.Reader(["en"], gpu=False)
        logger.info("EasyOCR model loaded in %.1f s", time.time() - started)
    return _reader


def preprocess(img):
    """Resize so the longest side is about MAX_SIDE px, then convert to grayscale."""
    h, w = img.shape[:2]
    scale = MAX_SIDE / max(h, w)
    method = cv2.INTER_CUBIC if scale > 1 else cv2.INTER_AREA
    img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=method)
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def read_image_bytes(data):
    """
    data: the uploaded file as bytes.
    Returns a list of {"text", "confidence", "bounding_box"} dicts.
    Raises ValueError if the bytes are not a readable image.
    """
    array = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(array, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("The uploaded file is not a readable image.")

    started = time.time()
    raw = get_reader().readtext(preprocess(img))
    logger.info(
        "OCR read %d lines from a %dx%d image in %.1f s",
        len(raw), img.shape[1], img.shape[0], time.time() - started,
    )

    return [
        {
            "text": text,
            "confidence": float(conf),
            "bounding_box": [[float(x), float(y)] for x, y in box],
        }
        for box, text, conf in raw
    ]
