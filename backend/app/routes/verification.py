from pathlib import Path
from uuid import uuid4
import io

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File
)

from sqlalchemy.orm import Session

from PIL import Image

from app.database import get_db
from app.models.verification import Verification
from app.schemas.verification import (
    VerificationCreate,
    VerificationResponse
)
from app.dependencies import get_current_user


router = APIRouter(
    prefix="/verification",
    tags=["Verification"]
)


# ============================================================
# IMAGE UPLOAD CONFIGURATION
# ============================================================

UPLOAD_DIR = Path("uploads/medicines")

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)


ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
}


MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


# ============================================================
# CREATE VERIFICATION
# ============================================================

@router.post(
    "/",
    response_model=VerificationResponse
)
def create_verification(
    verification_data: VerificationCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):

    user_id = int(current_user["sub"])

    new_verification = Verification(
        user_id=user_id,
        medicine_id=verification_data.medicine_id,
        result=verification_data.result,
        confidence_score=verification_data.confidence_score
    )

    db.add(new_verification)
    db.commit()
    db.refresh(new_verification)

    return new_verification


# ============================================================
# GET CURRENT USER'S VERIFICATION HISTORY
# ============================================================

@router.get(
    "/",
    response_model=list[VerificationResponse]
)
def get_verifications(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):

    user_id = int(current_user["sub"])

    verifications = db.query(
        Verification
    ).filter(
        Verification.user_id == user_id
    ).order_by(
        Verification.verified_at.desc()
    ).all()

    return verifications


# ============================================================
# GET ONE VERIFICATION
# ============================================================

@router.get(
    "/{verification_id}",
    response_model=VerificationResponse
)
def get_verification(
    verification_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):

    user_id = int(current_user["sub"])

    verification = db.query(
        Verification
    ).filter(
        Verification.verification_id == verification_id,
        Verification.user_id == user_id
    ).first()

    if not verification:

        raise HTTPException(
            status_code=404,
            detail="Verification not found"
        )

    return verification


# ============================================================
# UPLOAD MEDICINE IMAGE
# ============================================================

@router.post("/upload")
async def upload_medicine_image(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):

    # --------------------------------------------------------
    # Check file type
    # --------------------------------------------------------

    if file.content_type not in ALLOWED_CONTENT_TYPES:

        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG, and WEBP images are allowed."
        )

    # --------------------------------------------------------
    # Read uploaded file
    # --------------------------------------------------------

    file_data = await file.read()

    # --------------------------------------------------------
    # Check file size
    # --------------------------------------------------------

    if len(file_data) == 0:

        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )

    if len(file_data) > MAX_FILE_SIZE:

        raise HTTPException(
            status_code=400,
            detail="Image size must be 5 MB or less."
        )

    # --------------------------------------------------------
    # Validate that it is actually an image
    # --------------------------------------------------------

    try:

        image = Image.open(
            io.BytesIO(file_data)
        )

        image.verify()

    except Exception:

        raise HTTPException(
            status_code=400,
            detail="Uploaded file is not a valid image."
        )

    # --------------------------------------------------------
    # Generate a unique filename
    # --------------------------------------------------------

    extension = ALLOWED_CONTENT_TYPES[
        file.content_type
    ]

    filename = f"{uuid4().hex}{extension}"

    file_path = UPLOAD_DIR / filename

    # --------------------------------------------------------
    # Save image
    # --------------------------------------------------------

    with open(file_path, "wb") as buffer:
        buffer.write(file_data)

    # --------------------------------------------------------
    # Return upload information
    # --------------------------------------------------------

    return {
        "message": "Medicine image uploaded successfully",
        "filename": filename,
        "file_path": str(file_path),
        "content_type": file.content_type,
        "size": len(file_data)
    }