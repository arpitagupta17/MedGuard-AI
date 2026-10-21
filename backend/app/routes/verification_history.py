"""
GET /history/ : the logged-in user's past medicine checks, newest first.

Reads the verification table (filled by POST /verify-ocr/) and joins the
medicines table for the medicine name. Only the caller's own rows are returned.
"""
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/history", tags=["History"])

# The date column may be named differently in your table: the first one found is used
DATE_COLUMNS = (
    "verified_at", "created_at", "checked_at",
    "verification_date", "verified_on", "date", "timestamp",
)

# Value stored in verification.result  ->  value shown on the History page
RESULT_MAP = {
    # written by POST /verify-ocr/
    "match": "genuine",
    "suspicious": "flagged",
    "inconclusive": "unverified",
    "partial": "unverified",
    # older rows written by the earlier verification routes
    "authentic": "genuine",
    "genuine": "genuine",
    "counterfeit": "flagged",
    "fake": "flagged",
    "unable to verify": "unverified",
}


@router.get("/")
def my_history(
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),   # 401 if not logged in
):
    limit = max(1, min(limit, 500))
    user_id = int(current_user["sub"])

    rows = db.execute(
        text(
            "SELECT v.*, m.medicine_name AS _medicine_name "
            "FROM verification v "
            "LEFT JOIN medicines m ON m.medicine_id = v.medicine_id "
            "WHERE v.user_id = :uid "
            "ORDER BY v.verification_id DESC "
            "LIMIT :limit"
        ),
        {"uid": user_id, "limit": limit},
    ).mappings().all()

    items = []

    for row in rows:
        row = dict(row)

        date_value = next(
            (row[c] for c in DATE_COLUMNS if row.get(c) is not None), None
        )

        score = row.get("confidence_score")
        if isinstance(score, Decimal):
            score = float(score)

        raw_result = str(row.get("result") or "")

        items.append(
            {
                "id": row["verification_id"],
                # database name if the pack matched; otherwise the name read from the pack
                "medicine": (
                    row.get("_medicine_name")
                    or row.get("medicine_name")
                    or "Not in database"
                ),
                "matched": row.get("medicine_id") is not None,
                "strength": row.get("strength"),
                "manufacturer": row.get("manufacturer"),
                "batch_number": row.get("batch_number"),
                "expiry_date": row.get("expiry_date"),
                "result": RESULT_MAP.get(raw_result.lower(), "unverified"),
                "raw_result": raw_result,
                "confidence": score,
                "date": (
                    date_value.isoformat()
                    if hasattr(date_value, "isoformat")
                    else (str(date_value) if date_value is not None else None)
                ),
            }
        )

    return items
