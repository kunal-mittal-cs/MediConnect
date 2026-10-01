from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .models import User
from .auth import decode_access_token

oauth2_scheme=OAuth2PasswordBearer(tokenUrl="/auth/token")
def get_current_user(token:str=Depends(oauth2_scheme),db:Session=Depends(get_db)):
    try:
        payload=decode_access_token(token); uid=payload.get("sub")
        if uid is None: raise ValueError()
        user=db.query(User).filter(User.id==int(uid)).first()
        if not user or not user.is_active: raise ValueError()
        return user
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Invalid or expired token")
def require_role(role):
    def checker(user=Depends(get_current_user)):
        if user.role!=role: raise HTTPException(status_code=403,detail="Insufficient permissions")
        return user
    return checker
