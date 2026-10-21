from sqlalchemy import Column, Integer, String, Date, Numeric

from app.database import Base


class Medicine(Base):

    __tablename__ = "medicines"

    medicine_id = Column(
        Integer,
        primary_key=True
    )

    medicine_name = Column(
        String(150),
        nullable=False
    )

    batch_number = Column(
        String(100)
    )

    manufacturer = Column(
        String(150)
    )

    mfg_date = Column(
        Date
    )

    expiry_date = Column(
        Date
    )

    mrp = Column(
        Numeric(10, 2)
    )

    barcode = Column(
        String(100),
        unique=True
    )