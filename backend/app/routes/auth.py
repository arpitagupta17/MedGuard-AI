from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserSignup, UserLogin
from app.security import (
    hash_password,
    verify_password,
    create_access_token
)
from app.dependencies import get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# -------------------------
# SIGNUP
# -------------------------

@router.post("/signup")
def signup(
    user_data: UserSignup,
    db: Session = Depends(get_db)
):

    # Check if email already exists
    existing_user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Hash password before storing it
    hashed_password = hash_password(
        user_data.password
    )

    # Create new user
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password=hashed_password
    )

    # Save user to database
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create JWT immediately after signup
    access_token = create_access_token(
        data={
            "sub": str(new_user.user_id),
            "email": new_user.email
        }
    )

    # Return user information + JWT
    return {
        "message": "Account created successfully",
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": new_user.user_id,
        "name": new_user.name,
        "email": new_user.email
    }


# -------------------------
# LOGIN
# -------------------------

@router.post("/login")
def login(
    user_data: UserLogin,
    db: Session = Depends(get_db)
):

    # Find user by email
    user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Verify password
    password_correct = verify_password(
        user_data.password,
        user.password
    )

    if not password_correct:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Create JWT access token
    access_token = create_access_token(
        data={
            "sub": str(user.user_id),
            "email": user.email
        }
    )

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.user_id,
        "name": user.name,
        "email": user.email
    }


# -------------------------
# CURRENT USER
# -------------------------

@router.get("/me")
def get_me(
    current_user=Depends(get_current_user)
):

    return {
        "user_id": current_user["sub"],
        "email": current_user["email"]
    }