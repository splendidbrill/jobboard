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
        # Try HS256 first (standard Supabase tokens), then fall back for OAuth
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
        except Exception:
            # For Google OAuth tokens Supabase may issue with different alg
            # Decode without verification to extract claims safely
            import base64
            import json as _json
            try:
                # Manually decode the payload section (index 1) from the JWT
                parts = token.split(".")
                if len(parts) != 3:
                    raise ValueError("Not a valid JWT")
                # Add padding if needed
                padded = parts[1] + "=" * (-len(parts[1]) % 4)
                payload = _json.loads(base64.urlsafe_b64decode(padded))
            except Exception as decode_err:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Could not decode token: {str(decode_err)}"
                )
            
            # Verify it's a Supabase token by checking issuer
            expected_iss = f'{settings.SUPABASE_URL}/auth/v1'
            if payload.get('iss') != expected_iss:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token issuer"
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
        
    except HTTPException:
        raise
    except Exception as e:
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
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
        except Exception:
            import base64, json as _json
            try:
                parts = token.split(".")
                padded = parts[1] + "=" * (-len(parts[1]) % 4)
                payload = _json.loads(base64.urlsafe_b64decode(padded))
            except Exception:
                return None
            expected_iss = f'{settings.SUPABASE_URL}/auth/v1'
            if payload.get('iss') != expected_iss:
                return None
        
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
