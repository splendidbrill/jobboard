from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import uuid

from ..core.database import get_db
from ..core.auth import get_current_user, get_current_user_optional, CurrentUser
from ..models.models import User, Company, UserRole
from ..schemas import UserCreate, UserUpdate, UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a user record after Supabase authentication
    Called from frontend after successful Supabase signup
    """
    # Check if user already exists (by auth ID first, then by email)
    existing_user = (
        db.query(User).filter(User.id == current_user.id).first()
        or db.query(User).filter(User.email == user_data.email).first()
    )
    if existing_user:
        # Always update the role — user may have re-onboarded with a different choice
        print(f"Updating existing user {existing_user.email} role from {existing_user.role} to {user_data.role}")
        existing_user.role = user_data.role
        existing_user.id = current_user.id  # ensure ID is synced to auth ID
        db.commit()
        db.refresh(existing_user)
        print(f"User updated successfully: {existing_user.email} role is now {existing_user.role}")

        # If they switched to COMPANY, make sure a company profile exists
        if user_data.role == UserRole.COMPANY:
            existing_company = db.query(Company).filter(Company.user_id == existing_user.id).first()
            if not existing_company:
                company = Company(
                    id=str(uuid.uuid4()),
                    user_id=existing_user.id,
                    company_name=existing_user.name
                )
                db.add(company)
                db.commit()

        return existing_user
    
    # Create new user with the actual Supabase Auth ID
    user = User(
        id=current_user.id,
        email=user_data.email,
        name=user_data.name,
        phone=user_data.phone,
        role=user_data.role
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # If company role, create company profile
    if user_data.role == UserRole.COMPANY:
        company = Company(
            id=str(uuid.uuid4()),
            user_id=user.id,
            company_name=user_data.name
        )
        db.add(company)
        db.commit()
    
    return user



@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user profile"""
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_data: UserUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    update_data = user_data.model_dump(exclude_unset=True)
    
    # Handle JSON fields
    if "skills" in update_data and update_data["skills"]:
        update_data["skills"] = json.dumps(update_data["skills"])
    if "education" in update_data and update_data["education"]:
        update_data["education"] = json.dumps(update_data["education"])
    
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user (Admin only)"""
    if current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.role == "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete super admin"
        )
    
    db.delete(user)
    db.commit()
    
    return {"success": True, "message": "User deleted"}
