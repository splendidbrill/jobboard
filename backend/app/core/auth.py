from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel
from typing import Optional
from .config import settings

security = HTTPBearer()


class TokenPayload(BaseModel):
    sub: str  # User ID from Supabase
    email: Optional[str] = None
    role: Optional[str] = None
    app_metadata: Optional[dict] = None


class CurrentUser(BaseModel):
    id: str
    email: Optional[str] = None
    role: str = "JOB_SEEKER"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> CurrentUser:
    """
    Verify Supabase JWT token and return current user
    """
    token = credentials.credentials
    
    try:
        # Decode and verify the JWT token from Supabase
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        
        user_id = payload.get("sub")
        email = payload.get("email")
        
        # Get role from app_metadata (set by Supabase)
        app_metadata = payload.get("app_metadata", {})
        user_role = app_metadata.get("role", "JOB_SEEKER")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        
        return CurrentUser(
            id=user_id,
            email=email,
            role=user_role
        )
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    )
) -> Optional[CurrentUser]:
    """
    Get current user if token is provided, otherwise return None
    """
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        
        user_id = payload.get("sub")
        email = payload.get("email")
        app_metadata = payload.get("app_metadata", {})
        user_role = app_metadata.get("role", "JOB_SEEKER")
        
        if user_id:
            return CurrentUser(
                id=user_id,
                email=email,
                role=user_role
            )
    except:
        pass
    
    return None


def require_role(required_role: str):
    """
    Dependency to require a specific role
    """
    async def role_checker(current_user: CurrentUser = Depends(get_current_user)):
        if current_user.role != required_role and current_user.role != "SUPER_ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized for this action"
            )
        return current_user
    return role_checker
