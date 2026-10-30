import os
import secrets

from fastapi import APIRouter, Depends, HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from pydantic import BaseModel
from sqlalchemy import func
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
# GOOGLE SIGN-IN / SIGN-UP
# The website sends the credential Google gave the user. We check it with
# Google, then find the account with that email or create one.
# Needs  GOOGLE_CLIENT_ID=...  in backend/.env
# -------------------------

class GoogleLogin(BaseModel):
    credential: str


@router.post("/google")
def google_login(
    data: GoogleLogin,
    db: Session = Depends(get_db)
):
    client_id = os.getenv("GOOGLE_CLIENT_ID")

    if not client_id:
        raise HTTPException(
            status_code=503,
            detail="Google sign-in is not set up on the server."
        )

    # Google signs the credential. This checks the signature, the expiry
    # and that it was issued for OUR client id.
    try:
        info = google_id_token.verify_oauth2_token(
            data.credential,
            google_requests.Request(),
            client_id,
            clock_skew_in_seconds=10
        )
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Google sign-in failed. Please try again."
        )

    email = (info.get("email") or "").strip().lower()

    # Only trust an email address that Google itself has verified
    if not email or not info.get("email_verified"):
        raise HTTPException(
            status_code=401,
            detail="Your Google email address is not verified."
        )

    user = db.query(User).filter(
        func.lower(User.email) == email
    ).first()

    is_new = user is None

    if is_new:
        name = (info.get("name") or email.split("@")[0]).strip()[:100]

        # A Google account has no MedGuard password. A long random one is
        # stored so the password column is filled and nobody can guess it.
        user = User(
            name=name,
            email=email,
            password=hash_password(secrets.token_urlsafe(32))
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(
        data={
            "sub": str(user.user_id),
            "email": user.email
        }
    )

    return {
        "message": "Account created successfully" if is_new else "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.user_id,
        "name": user.name,
        "email": user.email,
        "is_new": is_new
    }


# -------------------------
# CURRENT USER
# -------------------------

def get_user_or_401(db: Session, current_user) -> User:
    """The logged-in user's row, or a 401 if the account no longer exists."""
    user = db.query(User).filter(
        User.user_id == int(current_user["sub"])
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Account not found")

    return user


@router.get("/me")
def get_me(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user = get_user_or_401(db, current_user)

    return {
        "user_id": user.user_id,
        "name": user.name,
        "email": user.email
    }


# -------------------------
# UPDATE PROFILE (name)
# -------------------------

class ProfileUpdate(BaseModel):
    name: str


@router.put("/me")
def update_me(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    name = data.name.strip()

    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    if len(name) > 100:
        raise HTTPException(status_code=400, detail="Name is too long")

    user = get_user_or_401(db, current_user)

    user.name = name
    db.commit()

    return {
        "message": "Profile updated",
        "user_id": user.user_id,
        "name": user.name,
        "email": user.email
    }


# -------------------------
# CHANGE PASSWORD
# -------------------------

class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
def change_password(
    data: PasswordChange,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user = get_user_or_401(db, current_user)

    if not verify_password(data.current_password, user.password):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )

    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 8 characters"
        )

    if data.new_password == data.current_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from the current one"
        )

    user.password = hash_password(data.new_password)
    db.commit()

    return {"message": "Password changed successfully"}
