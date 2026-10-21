"""
POST /verify-ocr/ : upload a medicine photo, get the OCR + database checks.

Login is required: the request must carry  Authorization: Bearer <token>.
Every completed check is saved in the verification table for that user,
so the History page can read it later.
"""
import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.services.barcode_reader import read_barcodes
from app.services.ocr_runner import read_image_bytes
from app.services.verification_service import (
    NotAMedicinePack,
    save_verification,
    verify_medicine,
)

# "uvicorn.error" always prints in the terminal where uvicorn runs
logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/verify-ocr", tags=["OCR verification"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


# A normal (not async) function: FastAPI runs it in a worker thread,
# so the slow OCR does not freeze the whole server.
@router.post("/")
def verify_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),   # 401 if not logged in
):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file.")

    data = file.file.read()

    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image is larger than 10 MB.")

    try:
        ocr_results = read_image_bytes(data)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    # Barcode / QR codes are optional: a failure here must not stop verification
    try:
        codes = read_barcodes(data)
    except Exception as error:  # noqa: BLE001
        logger.warning("Barcode reading failed: %s", error)
        codes = []

    try:
        result = verify_medicine(db, ocr_results, codes)
    except NotAMedicinePack:
        raise HTTPException(
            status_code=422,
            detail=(
                "This does not look like a medicine pack. Please upload a clear, "
                "well-lit photo of the medicine's packaging, showing the name, "
                "strength, batch number and dates."
            ),
        )

    # ------------------------------------------------------------------
    # Save this check for the logged-in user (History page).
    # A failure here must never hide the result from the user.
    # ------------------------------------------------------------------
    result["verification_id"] = None

    try:
        matched = result.get("matched_medicine") or {}

        result["verification_id"] = save_verification(
            db,
            user_id=int(current_user["sub"]),
            medicine_id=matched.get("medicine_id"),
            result=result["result"],
            confidence_score=result["confidence_score"],
            details=result.get("extracted"),
        )
    except Exception as error:  # noqa: BLE001
        db.rollback()
        logger.warning("Could not save verification: %s", error)

    # Raw OCR lines (text and confidence only) so the website can show them
    result["ocr"] = [
        {"text": item["text"], "confidence": round(item["confidence"], 4)}
        for item in ocr_results
    ]

    return result
