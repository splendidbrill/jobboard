from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, List, Any

from ..core.database import get_db
from ..core.auth import get_current_user, CurrentUser
from ..models.models import User, Company, Job, Application
from ..schemas import UserResponse, CompanyResponse, AdminStats

router = APIRouter(prefix="/admin", tags=["Admin"])


def require_super_admin(current_user: CurrentUser = Depends(get_current_user)):
    """Require super admin role"""
    if current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return current_user


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    current_user: CurrentUser = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Get admin dashboard statistics"""
    total_users = db.query(User).filter(User.role == "JOB_SEEKER").count()
    total_companies = db.query(Company).count()
    total_jobs = db.query(Job).count()
    total_applications = db.query(Application).count()
    open_jobs = db.query(Job).filter(Job.status == "OPEN").count()
    
    return AdminStats(
        total_users=total_users,
        total_companies=total_companies,
        total_jobs=total_jobs,
        total_applications=total_applications,
        open_jobs=open_jobs
    )


@router.get("/companies", response_model=Dict[str, Any])
async def get_admin_companies(
    country: str = None,
    city: str = None,
    search: str = None,
    current_user: CurrentUser = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Get all companies grouped by country and city"""
    query = db.query(Company).join(User)
    
    if country:
        query = query.filter(Company.country.ilike(f"%{country}%"))
    if city:
        query = query.filter(Company.city.ilike(f"%{city}%"))
    if search:
        query = query.filter(
            Company.company_name.ilike(f"%{search}%") |
            Company.description.ilike(f"%{search}%")
        )
    
    companies = query.order_by(Company.country, Company.city, Company.company_name).all()
    
    # Group by country and city
    grouped = {}
    for company in companies:
        country_name = company.country or "Unknown"
        city_name = company.city or "Unknown"
        
        if country_name not in grouped:
            grouped[country_name] = {}
        if city_name not in grouped[country_name]:
            grouped[country_name][city_name] = []
        
        company_dict = {
            "id": company.id,
            "company_name": company.company_name,
            "industry": company.industry,
            "is_verified": company.is_verified,
            "jobs_count": len(company.jobs),
            "user": {
                "id": company.user.id,
                "name": company.user.name,
                "email": company.user.email
            }
        }
        grouped[country_name][city_name].append(company_dict)
    
    return {"companies": companies, "grouped_by_country": grouped}


@router.get("/users", response_model=Dict[str, Any])
async def get_admin_users(
    country: str = None,
    city: str = None,
    search: str = None,
    role: str = None,
    current_user: CurrentUser = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Get all users grouped by country and city"""
    query = db.query(User)
    
    if country:
        query = query.filter(User.country.ilike(f"%{country}%"))
    if city:
        query = query.filter(User.city.ilike(f"%{city}%"))
    if search:
        query = query.filter(
            User.name.ilike(f"%{search}%") |
            User.email.ilike(f"%{search}%")
        )
    if role:
        query = query.filter(User.role == role)
    
    users = query.order_by(User.country, User.city, User.name).all()
    
    # Group by country and city
    grouped = {}
    for user in users:
        country_name = user.country or "Unknown"
        city_name = user.city or "Unknown"
        
        if country_name not in grouped:
            grouped[country_name] = {}
        if city_name not in grouped[country_name]:
            grouped[country_name][city_name] = []
        
        user_dict = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "applications_count": len(user.applications)
        }
        grouped[country_name][city_name].append(user_dict)
    
    return {"users": users, "grouped_by_country": grouped}


@router.delete("/users/{user_id}")
async def delete_user_admin(
    user_id: str,
    current_user: CurrentUser = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Delete user (admin)"""
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


@router.delete("/companies/{company_id}")
async def delete_company_admin(
    company_id: str,
    current_user: CurrentUser = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Delete company (admin)"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    db.delete(company)
    db.commit()
    
    return {"success": True, "message": "Company deleted"}
