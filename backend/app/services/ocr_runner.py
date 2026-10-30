"""
Reads a medicine image (raw bytes) and returns the OCR lines in the format
medicine_parser.parse_medicine_text() expects.

Engines
-------
EasyOCR (default) .... the main engine. Needs about 1.5-2 GB of RAM.
RapidOCR (fallback) .. same kind of text detection + recognition models run
                       through ONNX Runtime. Needs far less memory, so it can
                       run on a small free server.

Pick the engine with the environment variable  OCR_ENGINE:
    OCR_ENGINE=easyocr    (or not set)  ->  EasyOCR
    OCR_ENGINE=rapidocr                 ->  RapidOCR
"""
import logging
import os
import time

import cv2
import numpy as np

logger = logging.getLogger("uvicorn.error")

OCR_ENGINE = os.getenv("OCR_ENGINE", "easyocr").strip().lower()

# The longest side of the image is resized to this many pixels before reading.
# Smaller = faster and lighter on memory, but may miss tiny print.
MAX_SIDE = 1280 if OCR_ENGINE == "rapidocr" else 1600

_reader = None


# ------------------------------------------------------------------
# Loading the engine (once, the first time it is needed)
# ------------------------------------------------------------------
def get_reader():
    global _reader
    if _reader is None:
        started = time.time()
        if OCR_ENGINE == "rapidocr":
            from rapidocr_onnxruntime import RapidOCR
            _reader = RapidOCR()
            logger.info("RapidOCR loaded in %.1f s", time.time() - started)
        else:
            import easyocr
            _reader = easyocr.Reader(["en"], gpu=False)
            logger.info("EasyOCR model loaded in %.1f s", time.time() - started)
    return _reader


# ------------------------------------------------------------------
# Image preparation
# ------------------------------------------------------------------
def preprocess(img):
    """Resize so the longest side is about MAX_SIDE px."""
    h, w = img.shape[:2]
    scale = MAX_SIDE / max(h, w)

    if OCR_ENGINE == "rapidocr":
        scale = min(scale, 2)   # small image: enlarge at most 2x

    method = cv2.INTER_CUBIC if scale > 1 else cv2.INTER_AREA
    img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=method)

    if OCR_ENGINE == "rapidocr":
        return img                                   # RapidOCR takes colour
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)     # EasyOCR takes grayscale


# ------------------------------------------------------------------
# Reading
# ------------------------------------------------------------------
def run_engine(img):
    """Returns a list of (box, text, confidence) from whichever engine is on."""
    if OCR_ENGINE == "rapidocr":
        result, _ = get_reader()(img)
        return result or []
    return get_reader().readtext(img)


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
    raw = run_engine(preprocess(img))
    logger.info(
        "OCR (%s) read %d lines from a %dx%d image in %.1f s",
        OCR_ENGINE, len(raw), img.shape[1], img.shape[0], time.time() - started,
    )

    return [
        {
            "text": text,
            "confidence": float(conf),
            "bounding_box": [[float(x), float(y)] for x, y in box],
        }
        for box, text, conf in raw
    ]
