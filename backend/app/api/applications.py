from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from ..core.database import get_db
from ..core.auth import get_current_user, CurrentUser
from ..models.models import Application, Job, Company, User, Notification
from ..schemas import ApplicationCreate, ApplicationUpdate, ApplicationResponse, ApplicationWithJobResponse

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.get("/", response_model=List[ApplicationWithJobResponse])
async def get_applications(
    job_id: str = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get applications"""
    if current_user.role == "JOB_SEEKER":
        # Job seekers see their own applications
        query = db.query(Application).filter(Application.user_id == current_user.id)
    elif current_user.role == "COMPANY":
        # Companies see applications for their jobs
        company = db.query(Company).filter(Company.user_id == current_user.id).first()
        if not company:
            return []
        
        job_ids = [job.id for job in company.jobs]
        query = db.query(Application).filter(Application.job_id.in_(job_ids))
        
        if job_id:
            query = query.filter(Application.job_id == job_id)
    else:
        # Super admin sees all
        query = db.query(Application)
        if job_id:
            query = query.filter(Application.job_id == job_id)
    
    applications = query.order_by(Application.created_at.desc()).all()
    
    result = []
    for app in applications:
        app_dict = ApplicationWithJobResponse.model_validate(app)
        
        # Add job info
        if app.job:
            from ..schemas import JobWithCompanyResponse
            job_dict = JobWithCompanyResponse.model_validate(app.job)
            if app.job.company:
                from ..schemas import CompanyWithUserResponse
                company_dict = CompanyWithUserResponse.model_validate(app.job.company)
                company_dict.user = app.job.company.user
                job_dict.company = company_dict
            app_dict.job = job_dict
        
        # Add user info
        if app.user:
            app_dict.user = app.user
        
        result.append(app_dict)
    
    return result


@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    application_data: ApplicationCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Apply to a job"""
    if current_user.role != "JOB_SEEKER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only job seekers can apply to jobs"
        )
    
    # Check if job exists
    job = db.query(Job).filter(Job.id == application_data.job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Check if already applied
    existing = db.query(Application).filter(
        Application.job_id == application_data.job_id,
        Application.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied to this job"
        )
    
    # Create application
    application = Application(
        id=str(uuid.uuid4()),
        job_id=application_data.job_id,
        user_id=current_user.id,
        cover_letter=application_data.cover_letter,
        resume=application_data.resume
    )
    
    db.add(application)
    
    # Create notification for company
    notification = Notification(
        id=str(uuid.uuid4()),
        company_id=job.company_id,
        user_id=current_user.id,
        title="New Job Application",
        message=f"A new candidate has applied for \"{job.title}\"",
        notification_type="APPLICATION",
        related_id=application.id
    )
    db.add(notification)
    
    db.commit()
    db.refresh(application)
    
    return application


@router.get("/{application_id}", response_model=ApplicationWithJobResponse)
async def get_application(
    application_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get application by ID"""
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Check access
    is_owner = application.user_id == current_user.id
    is_company = False
    if current_user.role == "COMPANY":
        company = db.query(Company).filter(Company.user_id == current_user.id).first()
        if company and application.job.company_id == company.id:
            is_company = True
    
    if not is_owner and not is_company and current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    app_dict = ApplicationWithJobResponse.model_validate(application)
    
    # Add job info
    if application.job:
        from ..schemas import JobWithCompanyResponse
        job_dict = JobWithCompanyResponse.model_validate(application.job)
        if application.job.company:
            from ..schemas import CompanyWithUserResponse
            company_dict = CompanyWithUserResponse.model_validate(application.job.company)
            company_dict.user = application.job.company.user
            job_dict.company = company_dict
        app_dict.job = job_dict
    
    # Add user info
    if application.user:
        app_dict.user = application.user
    
    return app_dict


@router.put("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: str,
    application_data: ApplicationUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update application status"""
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Job seeker can withdraw
    if current_user.role == "JOB_SEEKER" and application.user_id == current_user.id:
        if application_data.status == "WITHDRAWN":
            application.status = application_data.status
            db.commit()
            db.refresh(application)
            return application
    
    # Company can update status
    if current_user.role == "COMPANY":
        company = db.query(Company).filter(Company.user_id == current_user.id).first()
        if company and application.job.company_id == company.id:
            application.status = application_data.status
            db.commit()
            db.refresh(application)
            
            # Create notification for user
            notification = Notification(
                id=str(uuid.uuid4()),
                company_id=company.id,
                user_id=application.user_id,
                title="Application Status Updated",
                message=f"Your application for \"{application.job.title}\" has been updated to {application_data.status}",
                notification_type="STATUS_UPDATE",
                related_id=application.id
            )
            db.add(notification)
            db.commit()
            
            return application
    
    # Super admin
    if current_user.role == "SUPER_ADMIN":
        application.status = application_data.status
        db.commit()
        db.refresh(application)
        return application
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized"
    )


@router.delete("/{application_id}")
async def delete_application(
    application_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete application"""
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Only owner or super admin can delete
    if application.user_id != current_user.id and current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    db.delete(application)
    db.commit()
    
    return {"success": True, "message": "Application deleted"}
