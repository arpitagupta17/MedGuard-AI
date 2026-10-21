"""
Medicine reports.

POST /reports/  : the logged-in user reports a suspicious medicine
                  (a description, and optionally a photo of the pack).
GET  /reports/  : the logged-in user's own reports, newest first.

The reports table has: report_id, user_id, medicine_image, description,
status, created_at.  medicine_image holds the saved photo's file name.
"""
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])

# backend/uploads/reports  (same layout as your uploads/medicines folder)
BASE_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BASE_DIR / "uploads" / "reports"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_DESCRIPTION = 4000


# ------------------------------------------------------------------
# CREATE A REPORT
# ------------------------------------------------------------------

@router.post("/")
def create_report(
    description: str = Form(...),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),   # 401 if not logged in
):
    description = description.strip()

    if not description:
        raise HTTPException(status_code=400, detail="Please describe the problem.")

    if len(description) > MAX_DESCRIPTION:
        raise HTTPException(
            status_code=400,
            detail=f"Description is too long (maximum {MAX_DESCRIPTION} characters).",
        )

    user_id = int(current_user["sub"])
    saved_name = None

    # Optional photo of the pack
    if image is not None and image.filename:
        if image.content_type not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Only JPG, PNG and WEBP images are allowed.",
            )

        data = image.file.read()

        if len(data) == 0:
            raise HTTPException(status_code=400, detail="The image is empty.")

        if len(data) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=400, detail="Image must be 10 MB or less.")

        saved_name = f"{uuid4().hex}{ALLOWED_TYPES[image.content_type]}"

        try:
            (UPLOAD_DIR / saved_name).write_bytes(data)
        except OSError as error:
            raise HTTPException(
                status_code=500, detail=f"Could not save the image: {error}"
            )

    row = db.execute(
        text(
            "INSERT INTO reports (user_id, medicine_image, description, status, created_at) "
            "VALUES (:user_id, :image, :description, 'Pending', CURRENT_TIMESTAMP) "
            "RETURNING report_id, created_at"
        ),
        {"user_id": user_id, "image": saved_name, "description": description},
    ).first()
    db.commit()

    return {
        "message": "Report submitted. Thank you for helping keep medicines safe.",
        "report_id": row[0],
        "status": "Pending",
        "created_at": row[1].isoformat() if hasattr(row[1], "isoformat") else str(row[1]),
    }


# ------------------------------------------------------------------
# LIST MY REPORTS
# ------------------------------------------------------------------

@router.get("/")
def my_reports(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),   # 401 if not logged in
):
    user_id = int(current_user["sub"])

    rows = db.execute(
        text(
            "SELECT report_id, medicine_image, description, status, created_at "
            "FROM reports WHERE user_id = :uid "
            "ORDER BY report_id DESC LIMIT 200"
        ),
        {"uid": user_id},
    ).mappings().all()

    return [
        {
            "id": r["report_id"],
            "description": r["description"] or "",
            "status": r["status"] or "Pending",
            "has_image": bool(r["medicine_image"]),
            "created_at": (
                r["created_at"].isoformat()
                if hasattr(r["created_at"], "isoformat")
                else (str(r["created_at"]) if r["created_at"] is not None else None)
            ),
        }
        for r in rows
    ]