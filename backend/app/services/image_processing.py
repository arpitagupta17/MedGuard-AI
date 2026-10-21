import cv2
import numpy as np

# The longest side of the image is scaled to about this many pixels.
TARGET_LONG_SIDE = 1800

# Never enlarge a small image by more than this factor.
MAX_UPSCALE = 4.0


def preprocess_for_ocr(image_bytes: bytes):
    """
    Decode the uploaded medicine image and resize it
    to a size that suits OCR.

    The image is not thresholded, because aggressive
    thresholding can erase small printed text.
    """

    image_array = np.frombuffer(
        image_bytes,
        dtype=np.uint8
    )

    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR
    )

    if image is None:
        raise ValueError(
            "Could not decode uploaded image."
        )

    height, width = image.shape[:2]

    scale = min(
        TARGET_LONG_SIDE / max(height, width),
        MAX_UPSCALE
    )

    # Cubic is best for enlarging, area is best for shrinking
    if scale > 1:
        interpolation = cv2.INTER_CUBIC
    else:
        interpolation = cv2.INTER_AREA

    new_width = max(1, int(width * scale))
    new_height = max(1, int(height * scale))

    image = cv2.resize(
        image,
        (new_width, new_height),
        interpolation=interpolation
    )

    return image


def read_qr_code(image):
    """
    Try to read a QR code from the image.

    Returns the decoded text, or None if no QR code
    is found. Never raises an error, so a QR problem
    can never break the OCR result.
    """

    try:
        detector = cv2.QRCodeDetector()

        value, _, _ = detector.detectAndDecode(image)

        return value or None

    except Exception:
        return None
