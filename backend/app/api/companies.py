from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from ..core.database import get_db
from ..core.auth import get_current_user, CurrentUser
from ..models.models import Company, User
from ..schemas import CompanyCreate, CompanyUpdate, CompanyResponse, CompanyWithUserResponse

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.get("/", response_model=List[CompanyWithUserResponse])
async def get_companies(
    country: Optional[str] = None,
    city: Optional[str] = None,
    industry: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all companies with optional filters"""
    query = db.query(Company).join(User)
    
    if country:
        query = query.filter(Company.country.ilike(f"%{country}%"))
    if city:
        query = query.filter(Company.city.ilike(f"%{city}%"))
    if industry:
        query = query.filter(Company.industry == industry)
    if search:
        query = query.filter(
            Company.company_name.ilike(f"%{search}%") |
            Company.description.ilike(f"%{search}%")
        )
    
    companies = query.order_by(Company.created_at.desc()).all()
    
    # Add jobs count
    result = []
    for company in companies:
        company_dict = CompanyWithUserResponse.model_validate(company)
        company_dict.jobs_count = len(company.jobs)
        result.append(company_dict)
    
    return result


@router.post("/", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    company_data: CompanyCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create company profile"""
    if current_user.role != "COMPANY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company accounts can create company profiles"
        )
    
    # Check if company already exists
    existing = db.query(Company).filter(Company.user_id == current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company profile already exists"
        )
    
    company = Company(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        **company_data.model_dump()
    )
    
    db.add(company)
    db.commit()
    db.refresh(company)
    
    return company


@router.get("/me", response_model=CompanyWithUserResponse)
async def get_my_company(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's company profile"""
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company profile not found"
        )
    
    result = CompanyWithUserResponse.model_validate(company)
    result.jobs_count = len(company.jobs)
    return result


@router.get("/{company_id}", response_model=CompanyWithUserResponse)
async def get_company(
    company_id: str,
    db: Session = Depends(get_db)
):
    """Get company by ID"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    result = CompanyWithUserResponse.model_validate(company)
    result.jobs_count = len(company.jobs)
    return result


@router.put("/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: str,
    company_data: CompanyUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update company profile"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Check ownership
    if company.user_id != current_user.id and current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    update_data = company_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)
    
    db.commit()
    db.refresh(company)
    
    return company


@router.delete("/{company_id}")
async def delete_company(
    company_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete company (Admin only)"""
    if current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    db.delete(company)
    db.commit()
    
    return {"success": True, "message": "Company deleted"}
