from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class VerificationCreate(BaseModel):

    medicine_id: Optional[int] = None

    result: str

    confidence_score: Optional[float] = None


class VerificationResponse(BaseModel):

    verification_id: int
    user_id: int
    medicine_id: Optional[int] = None
    result: str
    confidence_score: Optional[float] = None
    verified_at: Optional[datetime] = None

    class Config:
        from_attributes = True