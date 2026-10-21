import os
import sys

import cv2
import easyocr

from app.services.medicine_parser import parse_medicine_text

# Later these lists will come from your PostgreSQL medicines table
KNOWN_NAMES = [
    "Paracetamol", "Ibuprofen", "Amoxicillin", "Azithromycin", "Cetirizine",
    "Metformin", "Atorvastatin", "Amlodipine", "Pantoprazole", "Omeprazole",
    "Diclofenac", "Losartan", "Levocetirizine", "Montelukast", "Ciprofloxacin",
    "Metronidazole", "Domperidone", "Aspirin", "Telmisartan", "Glimepiride",
]
KNOWN_MAKERS = [
    "XYZ Pharma Ltd", "Cipla Ltd", "Micro Labs Ltd", "Zydus Lifesciences Ltd",
    "Sun Pharmaceutical Industries Ltd", "Alkem Laboratories Ltd",
]

IMAGE_TYPES = (".jpg", ".jpeg", ".png", ".bmp", ".webp")


def collect_images(args):
    paths = []
    for arg in args:
        if os.path.isdir(arg):
            for name in sorted(os.listdir(arg)):
                if name.lower().endswith(IMAGE_TYPES):
                    paths.append(os.path.join(arg, name))
        else:
            paths.append(arg)
    return paths


def preprocess(img):
    h, w = img.shape[:2]
    scale = 1600 / max(h, w)
    method = cv2.INTER_CUBIC if scale > 1 else cv2.INTER_AREA
    img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=method)
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def main():
    if len(sys.argv) < 2:
        print("Usage: python run_ocr_test.py <image or folder>")
        return

    paths = collect_images(sys.argv[1:])
    if not paths:
        print("No images found.")
        return

    reader = easyocr.Reader(["en"], gpu=False)

    for path in paths:
        print("\n" + "=" * 60)
        print("IMAGE:", path)
        print("=" * 60)

        img = cv2.imread(path)
        if img is None:
            print("Could not read this image.")
            continue

        raw = reader.readtext(preprocess(img))

        ocr_results = [
            {
                "text": text,
                "confidence": float(conf),
                "bounding_box": [[float(x), float(y)] for x, y in box],
            }
            for box, text, conf in raw
        ]

        print("\n--- RAW OCR ---")
        for item in ocr_results:
            print(f"{item['text']}  (confidence: {item['confidence']:.2f})")

        data = parse_medicine_text(ocr_results, KNOWN_NAMES, KNOWN_MAKERS)

        print("\n--- MEDICINE DATA ---")
        for key, value in data.items():
            print(f"{key:14s} {value}")


if __name__ == "__main__":
    main()