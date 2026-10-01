from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Notification
from ..schemas import (
    RegisterIn,
    LoginIn,
    TokenOut,
    UserOut,
    UserProfileUpdateIn,
    PasswordChangeIn,
)
from ..auth import (
    hash_password,
    verify_password,
    create_access_token,
)
from ..dependencies import get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# =========================================================
# REGISTER
# =========================================================

@router.post(
    "/register",
    response_model=TokenOut,
)
def register(
    data: RegisterIn,
    db: Session = Depends(get_db),
):
    role = data.role.upper().strip()

    if role not in ("PATIENT", "DOCTOR"):
        raise HTTPException(
            status_code=400,
            detail="Public registration supports Patient or Doctor only",
        )

    existing = (
        db.query(User)
        .filter(User.email == data.email)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Email already registered",
        )

    user = User(
        name=data.name.strip(),
        email=data.email,
        password_hash=hash_password(data.password),
        role=role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # ---------------------------------------------------------
    # NOTIFY ADMINS WHEN A NEW DOCTOR REGISTERS
    # ---------------------------------------------------------
    if role == "DOCTOR":
        admins = (
            db.query(User)
            .filter(
                User.role == "ADMIN",
                User.is_active == True,
            )
            .all()
        )

        for admin in admins:
            db.add(
                Notification(
                    user_id=admin.id,
                    title="New doctor registration",
                    message=(
                        f"{user.name} has registered as a doctor "
                        "and is waiting for verification."
                    ),
                    
                )
            )

        db.commit()

    # ---------------------------------------------------------
    # AUTOMATIC LOGIN AFTER REGISTRATION
    # ---------------------------------------------------------
    return {
        "access_token": create_access_token(
            {"sub": str(user.id)}
        ),
        "token_type": "bearer",
    }


# =========================================================
# LOGIN
# =========================================================

@router.post(
    "/login",
    response_model=TokenOut,
)
def login(
    data: LoginIn,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email == data.email)
        .first()
    )

    if (
        not user
        or not verify_password(
            data.password,
            user.password_hash,
        )
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="This account is inactive",
        )

    return {
        "access_token": create_access_token(
            {"sub": str(user.id)}
        ),
        "token_type": "bearer",
    }


# =========================================================
# OAUTH2 TOKEN
# =========================================================

@router.post(
    "/token",
    response_model=TokenOut,
)
def token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email == form_data.username)
        .first()
    )

    if (
        not user
        or not verify_password(
            form_data.password,
            user.password_hash,
        )
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="This account is inactive",
        )

    return {
        "access_token": create_access_token(
            {"sub": str(user.id)}
        ),
        "token_type": "bearer",
    }


# =========================================================
# CURRENT USER
# =========================================================

@router.get(
    "/me",
    response_model=UserOut,
)
def me(
    user=Depends(get_current_user),
):
    return user


# =========================================================
# UPDATE BASIC PROFILE
# =========================================================

@router.put(
    "/profile",
    response_model=UserOut,
)
def update_profile(
    data: UserProfileUpdateIn,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(User)
        .filter(
            User.email == data.email,
            User.id != user.id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Email is already registered to another account",
        )

    user.name = data.name.strip()
    user.email = data.email

    db.commit()
    db.refresh(user)

    return user


# =========================================================
# CHANGE PASSWORD
# =========================================================

@router.put("/password")
def change_password(
    data: PasswordChangeIn,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(
        data.current_password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect",
        )

    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different",
        )

    user.password_hash = hash_password(
        data.new_password
    )

    db.commit()

    return {
        "ok": True,
        "message": "Password updated successfully",
    }


# =========================================================
# DEACTIVATE ACCOUNT
# =========================================================

@router.put("/deactivate")
def deactivate_account(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.is_active = False

    db.commit()

    return {
        "ok": True,
        "message": "Account deactivated successfully",
    }