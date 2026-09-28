from datetime import date
from typing import Optional

from pydantic import BaseModel


class MedicineCreate(BaseModel):

    medicine_name: str

    batch_number: Optional[str] = None

    manufacturer: Optional[str] = None

    mfg_date: Optional[date] = None

    expiry_date: Optional[date] = None

    mrp: Optional[float] = None

    barcode: Optional[str] = None


class MedicineResponse(BaseModel):

    medicine_id: int

    medicine_name: str

    batch_number: Optional[str] = None

    manufacturer: Optional[str] = None

    mfg_date: Optional[date] = None

    expiry_date: Optional[date] = None

    mrp: Optional[float] = None

    barcode: Optional[str] = None

    class Config:
        from_attributes = True