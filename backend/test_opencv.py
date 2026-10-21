from pathlib import Path

import cv2

from app.services.image_processing import preprocess_for_ocr


# ============================================================
# MEDICINE IMAGE PATH
# ============================================================

# Replace this filename with the actual image
# inside backend/uploads/medicines/
image_path = Path(
    "uploads/medicines/Paracetamol.jpg"
)


# ============================================================
# CHECK IMAGE EXISTS
# ============================================================

if not image_path.exists():

    print("ERROR: Image not found.")
    print("Expected image at:")
    print(image_path)

    raise SystemExit(1)


# ============================================================
# READ IMAGE FILE
# ============================================================

image_bytes = image_path.read_bytes()

print("Original image found:")
print(image_path)
print()


# ============================================================
# OPEN CV PREPROCESSING
# ============================================================

try:

    processed_image = preprocess_for_ocr(
        image_bytes
    )

except Exception as error:

    print("ERROR during OpenCV processing:")
    print(error)

    raise SystemExit(1)


# ============================================================
# SAVE PROCESSED IMAGE
# ============================================================

output_path = Path(
    "uploads/medicines/processed_for_ocr.png"
)

success = cv2.imwrite(
    str(output_path),
    processed_image
)


# ============================================================
# RESULT
# ============================================================

if not success:

    print("ERROR: Could not save processed image.")

    raise SystemExit(1)


print("======================================")
print("OpenCV preprocessing successful!")
print("======================================")

print(
    "Processed image shape:",
    processed_image.shape
)

print(
    "Processed image saved at:"
)

print(output_path)