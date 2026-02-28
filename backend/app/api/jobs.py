from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import uuid
from datetime import datetime

from ..core.database import get_db
from ..core.auth import get_current_user, get_current_user_optional, CurrentUser
from ..models.models import Job, Company, Application, User
from ..schemas import (
    JobCreate, JobUpdate, JobResponse, JobWithCompanyResponse,
    WorkMode, JobType, JobStatus
)

router = APIRouter(prefix="/jobs", tags=["Jobs"])

# Profession keyword mapping
PROFESSION_KEYWORDS = {
    "software": ["software", "developer", "engineer", "programmer", "full stack", "backend", "frontend", "web developer", "mobile developer", "devops", "sre"],
    "data": ["data", "analyst", "scientist", "machine learning", "ml", "ai", "artificial intelligence", "analytics", "bi", "business intelligence"],
    "design": ["design", "ux", "ui", "designer", "graphic", "product designer", "visual", "creative"],
    "marketing": ["marketing", "seo", "sem", "content", "social media", "brand", "growth", "digital marketing", "campaign"],
    "sales": ["sales", "account", "business development", "bd", "representative", "account executive", "sdr", "bdr"],
    "finance": ["finance", "accounting", "accountant", "financial", "cfo", "controller", "bookkeeper", "treasury"],
    "hr": ["hr", "human resources", "recruiter", "talent", "people", "compensation", "benefits"],
    "operations": ["operations", "ops", "logistics", "supply chain", "project manager", "program manager"],
    "healthcare": ["healthcare", "medical", "nurse", "doctor", "physician", "clinical", "health", "pharmaceutical"],
    "engineering": ["engineer", "engineering", "mechanical", "electrical", "civil", "structural", "chemical"]
}


@router.get("/", response_model=List[JobWithCompanyResponse])
async def get_jobs(
    country: Optional[str] = None,
    city: Optional[str] = None,
    search: Optional[str] = None,
    job_type: Optional[JobType] = None,
    work_mode: Optional[WorkMode] = None,
    experience_level: Optional[str] = None,
    profession: Optional[str] = None,
    company_id: Optional[str] = None,
    status: Optional[JobStatus] = JobStatus.OPEN,
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get all jobs with optional filters"""
    query = db.query(Job).join(Company).join(User, Company.user_id == User.id)
    
    # Apply filters
    if country:
        query = query.filter(Job.country.ilike(f"%{country}%"))
    if city:
        query = query.filter(Job.city.ilike(f"%{city}%"))
    if job_type:
        query = query.filter(Job.job_type == job_type)
    if work_mode:
        query = query.filter(Job.work_mode == work_mode)
    if experience_level:
        query = query.filter(Job.experience_level == experience_level)
    if company_id:
        query = query.filter(Job.company_id == company_id)
    if status:
        query = query.filter(Job.status == status)
    
    # Search filter
    if search:
        query = query.filter(
            Job.title.ilike(f"%{search}%") |
            Job.description.ilike(f"%{search}%")
        )
    
    # Profession filter
    if profession and profession != "all_professions" and profession in PROFESSION_KEYWORDS:
        keywords = PROFESSION_KEYWORDS[profession]
        profession_filter = False
        for keyword in keywords:
            profession_filter = profession_filter | (
                Job.title.ilike(f"%{keyword}%") |
                Job.description.ilike(f"%{keyword}%") |
                Job.skills.ilike(f"%{keyword}%")
            )
        query = query.filter(profession_filter)
    
    jobs = query.order_by(Job.created_at.desc()).limit(50).all()
    
    # Build response
    result = []
    for job in jobs:
        job_dict = JobWithCompanyResponse.model_validate(job)
        
        # Add company info
        if job.company:
            from ..schemas import CompanyWithUserResponse
            company_dict = CompanyWithUserResponse.model_validate(job.company)
            company_dict.user = job.company.user
            company_dict.jobs_count = len(job.company.jobs)
            job_dict.company = company_dict
        
        # Add applications count
        job_dict.applications_count = len(job.applications)
        
        # Check if current user has applied
        job_dict.has_applied = False
        if current_user:
            application = db.query(Application).filter(
                Application.job_id == job.id,
                Application.user_id == current_user.id
            ).first()
            job_dict.has_applied = application is not None
        
        result.append(job_dict)
    
    return result


@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_data: JobCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new job posting"""
    if current_user.role != "COMPANY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only companies can post jobs"
        )
    
    # Get company
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company profile not found"
        )
    
    # Create job
    job = Job(
        id=str(uuid.uuid4()),
        company_id=company.id,
        title=job_data.title,
        description=job_data.description,
        requirements=json.dumps(job_data.requirements) if job_data.requirements else None,
        responsibilities=json.dumps(job_data.responsibilities) if job_data.responsibilities else None,
        country=job_data.country,
        city=job_data.city,
        work_mode=job_data.work_mode,
        salary_min=job_data.salary_min,
        salary_max=job_data.salary_max,
        salary_currency=job_data.salary_currency,
        salary_period=job_data.salary_period,
        job_type=job_data.job_type,
        experience_level=job_data.experience_level,
        skills=json.dumps(job_data.skills) if job_data.skills else None,
        status=job_data.status,
        application_deadline=job_data.application_deadline
    )
    
    db.add(job)
    db.commit()
    db.refresh(job)
    
    return job


@router.get("/my-jobs", response_model=List[JobWithCompanyResponse])
async def get_my_jobs(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get jobs posted by current company"""
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company profile not found"
        )
    
    jobs = db.query(Job).filter(Job.company_id == company.id).order_by(Job.created_at.desc()).all()
    
    result = []
    for job in jobs:
        job_dict = JobWithCompanyResponse.model_validate(job)
        job_dict.applications_count = len(job.applications)
        result.append(job_dict)
    
    return result


@router.get("/{job_id}", response_model=JobWithCompanyResponse)
async def get_job(
    job_id: str,
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get job by ID"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    job_dict = JobWithCompanyResponse.model_validate(job)
    
    # Add company info
    if job.company:
        from ..schemas import CompanyWithUserResponse
        company_dict = CompanyWithUserResponse.model_validate(job.company)
        company_dict.user = job.company.user
        company_dict.jobs_count = len(job.company.jobs)
        job_dict.company = company_dict
    
    job_dict.applications_count = len(job.applications)
    
    # Check if current user has applied
    job_dict.has_applied = False
    if current_user:
        application = db.query(Application).filter(
            Application.job_id == job.id,
            Application.user_id == current_user.id
        ).first()
        job_dict.has_applied = application is not None
    
    return job_dict


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: str,
    job_data: JobUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update job posting"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Check ownership
    company = db.query(Company).filter(Company.id == job.company_id).first()
    if company.user_id != current_user.id and current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    update_data = job_data.model_dump(exclude_unset=True)
    
    # Handle JSON fields
    if "requirements" in update_data and update_data["requirements"]:
        update_data["requirements"] = json.dumps(update_data["requirements"])
    if "responsibilities" in update_data and update_data["responsibilities"]:
        update_data["responsibilities"] = json.dumps(update_data["responsibilities"])
    if "skills" in update_data and update_data["skills"]:
        update_data["skills"] = json.dumps(update_data["skills"])
    
    for field, value in update_data.items():
        setattr(job, field, value)
    
    db.commit()
    db.refresh(job)
    
    return job


@router.delete("/{job_id}")
async def delete_job(
    job_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete job posting"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Check ownership
    company = db.query(Company).filter(Company.id == job.company_id).first()
    if company.user_id != current_user.id and current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    db.delete(job)
    db.commit()
    
    return {"success": True, "message": "Job deleted"}
