from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.medicine import Medicine
from app.schemas.medicine import MedicineCreate, MedicineResponse


router = APIRouter(
    prefix="/medicines",
    tags=["Medicines"]
)


# -----------------------------------
# GET ALL MEDICINES
# -----------------------------------

@router.get(
    "/",
    response_model=list[MedicineResponse]
)
def get_medicines(
    db: Session = Depends(get_db)
):

    medicines = db.query(Medicine).all()

    return medicines


# -----------------------------------
# GET MEDICINE BY ID
# -----------------------------------

@router.get(
    "/{medicine_id}",
    response_model=MedicineResponse
)
def get_medicine(
    medicine_id: int,
    db: Session = Depends(get_db)
):

    medicine = db.query(Medicine).filter(
        Medicine.medicine_id == medicine_id
    ).first()

    if not medicine:
        raise HTTPException(
            status_code=404,
            detail="Medicine not found"
        )

    return medicine


# -----------------------------------
# CREATE MEDICINE
# -----------------------------------

@router.post(
    "/",
    response_model=MedicineResponse
)
def create_medicine(
    medicine: MedicineCreate,
    db: Session = Depends(get_db)
):

    new_medicine = Medicine(
        medicine_name=medicine.medicine_name,
        batch_number=medicine.batch_number,
        manufacturer=medicine.manufacturer,
        mfg_date=medicine.mfg_date,
        expiry_date=medicine.expiry_date,
        mrp=medicine.mrp,
        barcode=medicine.barcode
    )

    db.add(new_medicine)

    db.commit()

    db.refresh(new_medicine)

    return new_medicine


# -----------------------------------
# UPDATE MEDICINE
# -----------------------------------

@router.put(
    "/{medicine_id}",
    response_model=MedicineResponse
)
def update_medicine(
    medicine_id: int,
    medicine_data: MedicineCreate,
    db: Session = Depends(get_db)
):

    medicine = db.query(Medicine).filter(
        Medicine.medicine_id == medicine_id
    ).first()

    if not medicine:
        raise HTTPException(
            status_code=404,
            detail="Medicine not found"
        )

    medicine.medicine_name = medicine_data.medicine_name
    medicine.batch_number = medicine_data.batch_number
    medicine.manufacturer = medicine_data.manufacturer
    medicine.mfg_date = medicine_data.mfg_date
    medicine.expiry_date = medicine_data.expiry_date
    medicine.mrp = medicine_data.mrp
    medicine.barcode = medicine_data.barcode

    db.commit()

    db.refresh(medicine)

    return medicine


# -----------------------------------
# DELETE MEDICINE
# -----------------------------------

@router.delete("/{medicine_id}")
def delete_medicine(
    medicine_id: int,
    db: Session = Depends(get_db)
):

    medicine = db.query(Medicine).filter(
        Medicine.medicine_id == medicine_id
    ).first()

    if not medicine:
        raise HTTPException(
            status_code=404,
            detail="Medicine not found"
        )

    db.delete(medicine)

    db.commit()

    return {
        "message": "Medicine deleted successfully"
    }