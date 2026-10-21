"""
Reads barcodes and QR codes from a medicine photo and understands GS1 data.

Many packs carry a GS1 code that holds the product ID (GTIN), the batch,
the expiry date and sometimes a serial number. Reading it gives a second,
independent source for the batch and expiry printed on the pack.

IMPORTANT: a code can be copied onto a fake pack, so a matching code is
evidence, not proof. Everything here is optional: if no code can be read,
verification simply carries on with the printed text.
"""
import re
from urllib.parse import parse_qs, urlparse

import cv2
import numpy as np

try:
    import zxingcpp
except ImportError:  # the library is optional
    zxingcpp = None

GS = "\x1d"  # the group separator that ends a variable-length GS1 field

# Application identifiers (AI) that have a fixed length
FIXED_LENGTH = {"00": 18, "01": 14, "02": 14, "11": 6, "12": 6, "13": 6, "15": 6, "16": 6, "17": 6, "20": 2}
# Variable-length AIs we care about (maximum length)
VARIABLE = {"10": 20, "21": 20}


# ------------------------------------------------------------------
# Reading the image
# ------------------------------------------------------------------

def read_barcodes(data):
    """
    data: the uploaded image as bytes.
    Returns a list of {"format", "text"} for every code found (may be empty).
    """
    if zxingcpp is None:
        return []

    array = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(array, cv2.IMREAD_COLOR)

    if img is None:
        return []

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape[:2]

    attempts = [gray]

    # Small or blurry codes are often readable after resizing or sharpening
    longest = max(h, w)
    if longest < 1600:
        scale = 1600 / longest
        attempts.append(cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC))
    elif longest > 2600:
        scale = 2000 / longest
        attempts.append(cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA))

    attempts.append(cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 41, 10))

    for image in attempts:
        try:
            found = zxingcpp.read_barcodes(image)
        except Exception:  # noqa: BLE001
            found = []

        if found:
            codes, seen = [], set()
            for item in found:
                key = item.text
                if key and key not in seen:
                    seen.add(key)
                    codes.append({"format": str(item.format).split(".")[-1], "text": item.text})
            if codes:
                return codes

    return []


# ------------------------------------------------------------------
# Understanding the text of a code
# ------------------------------------------------------------------

def normalize_gtin(value):
    """Digits only, padded to 14 (GTIN-14) so EAN-13 and GTIN-14 compare equal."""
    digits = re.sub(r"\D", "", str(value or ""))
    return digits.zfill(14) if 8 <= len(digits) <= 14 else None


def gtin_is_valid(gtin):
    """GS1 check digit test."""
    if not gtin or len(gtin) != 14:
        return False
    total = sum(int(d) * (3 if i % 2 == 0 else 1) for i, d in enumerate(gtin[:-1]))
    return (10 - total % 10) % 10 == int(gtin[-1])


def gs1_date_to_month(value):
    """'270430' -> '2027-04' (YYMMDD; day 00 means the end of the month)."""
    if not value or not re.fullmatch(r"\d{6}", value):
        return None
    year, month = 2000 + int(value[:2]), int(value[2:4])
    return f"{year}-{month:02d}" if 1 <= month <= 12 else None


def _parse_bracketed(text):
    return dict(re.findall(r"\((\d{2,4})\)([^()]*)", text))


def _parse_element_string(text):
    """'01089012345678951 0AZT2405\x1d17270430' style strings without brackets."""
    fields, i = {}, 0
    text = text.replace("]d2", "").replace("]Q3", "").replace("]C1", "")

    while i < len(text):
        ai = text[i:i + 2]

        if ai in FIXED_LENGTH:
            length = FIXED_LENGTH[ai]
            fields[ai] = text[i + 2:i + 2 + length]
            i += 2 + length
        elif ai in VARIABLE:
            end = text.find(GS, i + 2)
            end = len(text) if end == -1 else end
            fields[ai] = text[i + 2:min(end, i + 2 + VARIABLE[ai])]
            i = end + 1 if end != -1 and end < i + 2 + VARIABLE[ai] + 1 else i + 2 + len(fields[ai])
        else:
            break  # unknown field: stop rather than guess

    return fields


def _parse_digital_link(text):
    """https://example.com/01/0890.../10/BATCH?17=270430"""
    url = urlparse(text)
    parts = [p for p in url.path.split("/") if p]
    fields = {}

    for i in range(len(parts) - 1):
        if parts[i] in ("01", "10", "21", "17"):
            fields[parts[i]] = parts[i + 1]

    for key, values in parse_qs(url.query).items():
        if key in ("17", "10", "21", "01"):
            fields[key] = values[0]

    return fields


def parse_code(text, fmt=""):
    """
    Turn the text of one code into {"gtin", "batch", "expiry_iso", "serial"}.
    Fields that are not in the code are None.
    """
    text = (text or "").strip()
    fields = {}

    if text.startswith(("http://", "https://")):
        fields = _parse_digital_link(text)
    elif "(" in text and re.search(r"\(\d{2}\)", text):
        fields = _parse_bracketed(text)
    elif re.fullmatch(r"\d{8,14}", text):
        fields = {"01": text}  # a plain product barcode (EAN / UPC)
    elif re.match(r"^(\]\w\d)?\d{2}", text):
        fields = _parse_element_string(text)

    gtin = normalize_gtin(fields.get("01"))

    return {
        "format": fmt,
        "raw": text[:200],
        "gtin": gtin,
        "gtin_valid": gtin_is_valid(gtin) if gtin else None,
        "batch": (fields.get("10") or "").strip() or None,
        "expiry_iso": gs1_date_to_month(fields.get("17")),
        "serial": (fields.get("21") or "").strip() or None,
    }


def best_code(codes):
    """Choose the most useful code: the one holding a batch, else a GTIN, else any."""
    parsed = [parse_code(c["text"], c.get("format", "")) for c in codes]

    for key in ("batch", "gtin"):
        for item in parsed:
            if item[key]:
                return item

    return parsed[0] if parsed else None
