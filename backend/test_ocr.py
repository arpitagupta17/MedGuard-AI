import easyocr
from pathlib import Path


# ============================================================
# IMAGE PATH
# ============================================================

image_path = Path(
    "uploads/medicines/paracetamol.png"
)


# ============================================================
# CHECK IMAGE
# ============================================================

if not image_path.exists():

    print("ERROR: Image not found.")
    print("Expected:", image_path)

    raise SystemExit(1)


# ============================================================
# CREATE OCR READER
# ============================================================

print("Loading EasyOCR...")

reader = easyocr.Reader(
    ["en"],
    gpu=False
)

print("EasyOCR loaded successfully.")


# ============================================================
# RUN OCR
# ============================================================

print("\nRunning OCR...\n")

results = reader.readtext(
    str(image_path)
)


# ============================================================
# DISPLAY RESULTS
# ============================================================

print("========== OCR RESULTS ==========\n")

if not results:

    print("No text detected.")

else:

    for result in results:

        bounding_box = result[0]
        text = result[1]
        confidence = result[2]

        print(
            f"Text: {text}"
        )

        print(
            f"Confidence: {confidence:.2f}"
        )

        print()