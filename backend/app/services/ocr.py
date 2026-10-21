import easyocr


# ============================================================
# LOAD OCR MODEL ONCE
# ============================================================

reader = easyocr.Reader(
    ["en"],
    gpu=False
)


# ============================================================
# EXTRACT TEXT
# ============================================================

def extract_text(image):
    """
    Extract readable text from any medicine package image.

    Parameters
    ----------
    image:
        OpenCV image (NumPy array)

    Returns
    -------
    list:
        OCR results containing:
        - detected text
        - confidence score
        - bounding box
    """

    # --------------------------------------------------------
    # RUN EASY OCR
    # --------------------------------------------------------

    results = reader.readtext(
        image
    )

    extracted_text = []

    # --------------------------------------------------------
    # PROCESS OCR RESULTS
    # --------------------------------------------------------

    for result in results:

        bounding_box = result[0]
        text = result[1]
        confidence = result[2]

        # ----------------------------------------------------
        # CONVERT NUMPY COORDINATES TO NORMAL PYTHON INTS
        # ----------------------------------------------------

        clean_bounding_box = []

        for point in bounding_box:

            clean_point = [
                int(point[0]),
                int(point[1])
            ]

            clean_bounding_box.append(
                clean_point
            )

        # ----------------------------------------------------
        # ADD CLEAN RESULT
        # ----------------------------------------------------

        extracted_text.append(
            {
                "text": str(text).strip(),

                "confidence": round(
                    float(confidence),
                    4
                ),

                "bounding_box":
                    clean_bounding_box
            }
        )

    return extracted_text