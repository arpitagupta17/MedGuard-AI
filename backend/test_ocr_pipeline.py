from pathlib import Path

from app.services.image_processing import preprocess_for_ocr
from app.services.ocr import extract_text
from app.services.medicine_parser import parse_medicine_text


image_path = Path(
    "uploads/medicines/paracetamol.png"
)


if not image_path.exists():
    print("ERROR: Image not found.")
    print("Expected image:")
    print(image_path)
    raise SystemExit(1)


# --------------------------------
# READ IMAGE
# --------------------------------

image_bytes = image_path.read_bytes()


# --------------------------------
# OPENCV
# --------------------------------

print("Running OpenCV preprocessing...")

processed_image = preprocess_for_ocr(
    image_bytes
)


# --------------------------------
# OCR
# --------------------------------

print("Running EasyOCR...")

ocr_results = extract_text(
    processed_image
)


print("\n========== RAW OCR ==========\n")

for item in ocr_results:
    print(
        f"{item['text']} "
        f"(confidence: {item['confidence']})"
    )


# --------------------------------
# PARSER
# --------------------------------

medicine_data = parse_medicine_text(
    ocr_results
)


print("\n========== MEDICINE DATA ==========\n")

print(
    "Medicine Name:",
    medicine_data["medicine_name"]
)

print(
    "Strength:",
    medicine_data["strength"]
)

print(
    "Batch Number:",
    medicine_data["batch_number"]
)

print(
    "Manufacturer:",
    medicine_data["manufacturer"]
)

print(
    "Manufacturing Date:",
    medicine_data["mfg_date"]
)

print(
    "Expiry Date:",
    medicine_data["expiry_date"]
)

print(
    "MRP:",
    medicine_data["mrp"]
)