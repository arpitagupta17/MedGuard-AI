from sqlalchemy import Column, Integer, String, Numeric, DateTime
from sqlalchemy.sql import func

from app.database import Base


class Verification(Base):

    __tablename__ = "verification"

    verification_id = Column(
        Integer,
        primary_key=True
    )

    user_id = Column(
        Integer,
        nullable=False
    )

    medicine_id = Column(
        Integer,
        nullable=True
    )

    result = Column(
        String(50),
        nullable=False
    )

    confidence_score = Column(
        Numeric(5, 2),
        nullable=True
    )

    verified_at = Column(
        DateTime,
        server_default=func.now()
    )