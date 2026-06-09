from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, UserResponse, Token
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user
from app.core.roles import get_user_role, ROLE_PERMISSIONS
from app.services.activity_service import log_activity
from fastapi.security import OAuth2PasswordRequestForm

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=201)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(username=user_data.username, email=user_data.email,
                hashed_password=get_password_hash(user_data.password),
                full_name=user_data.full_name, role="analyst")
    db.add(user)
    db.commit()
    db.refresh(user)
    log_activity(db, "user_registered", user_id=user.id, resource="user", resource_id=user.id)
    return user


@router.post("/login", response_model=Token)
def login(user_data: UserLogin, request: Request = None, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    access_token = create_access_token(data={"sub": user.username})
    ip = request.client.host if request and request.client else None
    log_activity(db, "user_login", user_id=user.id, ip_address=ip)
    return Token(access_token=access_token, token_type="bearer", user=UserResponse.model_validate(user))


@router.post("/token")
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    return {"access_token": create_access_token(data={"sub": user.username}), "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/me/permissions")
def get_my_permissions(current_user: User = Depends(get_current_user)):
    role = get_user_role(current_user)
    return {"role": role, "permissions": ROLE_PERMISSIONS.get(role, [])}


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.patch("/me", response_model=UserResponse)
def update_me(data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.email and data.email != current_user.email:
        if db.query(User).filter(User.email == data.email).first():
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = data.email
    if data.full_name is not None:
        current_user.full_name = data.full_name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(data: PasswordChange, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    log_activity(db, "password_changed", user_id=current_user.id)
    return {"message": "Password updated successfully"}
