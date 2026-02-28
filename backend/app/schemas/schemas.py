from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# Enums
class UserRole(str, Enum):
    JOB_SEEKER = "JOB_SEEKER"
    COMPANY = "COMPANY"
    SUPER_ADMIN = "SUPER_ADMIN"


class WorkMode(str, Enum):
    REMOTE = "REMOTE"
    HYBRID = "HYBRID"
    ONSITE = "ONSITE"


class JobType(str, Enum):
    FULL_TIME = "FULL_TIME"
    PART_TIME = "PART_TIME"
    CONTRACT = "CONTRACT"
    INTERNSHIP = "INTERNSHIP"
    FREELANCE = "FREELANCE"


class JobStatus(str, Enum):
    DRAFT = "DRAFT"
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    FILLED = "FILLED"


class ApplicationStatus(str, Enum):
    PENDING = "PENDING"
    REVIEWING = "REVIEWING"
    INTERVIEWED = "INTERVIEWED"
    REJECTED = "REJECTED"
    ACCEPTED = "ACCEPTED"
    WITHDRAWN = "WITHDRAWN"


# Base schemas
class BaseResponse(BaseModel):
    class Config:
        from_attributes = True


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    role: UserRole = UserRole.JOB_SEEKER


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    headline: Optional[str] = None
    summary: Optional[str] = None
    skills: Optional[List[str]] = None
    experience: Optional[str] = None
    education: Optional[List[dict]] = None
    resume: Optional[str] = None
    profile_picture: Optional[str] = None


class UserResponse(BaseResponse):
    id: str
    email: str
    name: str
    phone: Optional[str]
    role: UserRole
    profile_picture: Optional[str]
    headline: Optional[str]
    summary: Optional[str]
    country: Optional[str]
    city: Optional[str]
    skills: Optional[str]
    experience: Optional[str]
    resume: Optional[str]
    created_at: datetime


# Company Schemas
class CompanyBase(BaseModel):
    company_name: str
    description: Optional[str] = None
    website: Optional[str] = None
    logo: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    founded_year: Optional[int] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    logo: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    founded_year: Optional[int] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    is_verified: Optional[bool] = None


class CompanyResponse(BaseResponse):
    id: str
    user_id: str
    company_name: str
    description: Optional[str]
    website: Optional[str]
    logo: Optional[str]
    industry: Optional[str]
    company_size: Optional[str]
    founded_year: Optional[int]
    country: Optional[str]
    city: Optional[str]
    is_verified: bool
    created_at: datetime


class CompanyWithUserResponse(CompanyResponse):
    user: Optional[UserResponse] = None
    jobs_count: int = 0


# Job Schemas
class JobBase(BaseModel):
    title: str
    description: str
    requirements: Optional[List[str]] = None
    responsibilities: Optional[List[str]] = None
    country: Optional[str] = None
    city: Optional[str] = None
    work_mode: WorkMode = WorkMode.ONSITE
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: str = "USD"
    salary_period: str = "yearly"
    job_type: JobType = JobType.FULL_TIME
    experience_level: Optional[str] = None
    skills: Optional[List[str]] = None
    status: JobStatus = JobStatus.OPEN
    application_deadline: Optional[datetime] = None


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[List[str]] = None
    responsibilities: Optional[List[str]] = None
    country: Optional[str] = None
    city: Optional[str] = None
    work_mode: Optional[WorkMode] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = None
    salary_period: Optional[str] = None
    job_type: Optional[JobType] = None
    experience_level: Optional[str] = None
    skills: Optional[List[str]] = None
    status: Optional[JobStatus] = None
    application_deadline: Optional[datetime] = None


class JobResponse(BaseResponse):
    id: str
    company_id: str
    title: str
    description: str
    requirements: Optional[str]
    responsibilities: Optional[str]
    country: Optional[str]
    city: Optional[str]
    work_mode: WorkMode
    salary_min: Optional[int]
    salary_max: Optional[int]
    salary_currency: str
    salary_period: str
    job_type: JobType
    experience_level: Optional[str]
    skills: Optional[str]
    status: JobStatus
    application_deadline: Optional[datetime]
    created_at: datetime


class JobWithCompanyResponse(JobResponse):
    company: Optional[CompanyWithUserResponse] = None
    applications_count: int = 0
    has_applied: bool = False


# Application Schemas
class ApplicationBase(BaseModel):
    cover_letter: Optional[str] = None
    resume: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    job_id: str


class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None


class ApplicationResponse(BaseResponse):
    id: str
    job_id: str
    user_id: str
    cover_letter: Optional[str]
    resume: Optional[str]
    status: ApplicationStatus
    created_at: datetime


class ApplicationWithJobResponse(ApplicationResponse):
    job: Optional[JobWithCompanyResponse] = None
    user: Optional[UserResponse] = None


# Notification Schemas
class NotificationResponse(BaseResponse):
    id: str
    company_id: str
    user_id: str
    title: str
    message: str
    notification_type: str
    related_id: Optional[str]
    is_read: bool
    created_at: datetime


# Auth Schemas
class SupabaseAuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: dict


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Stats Schemas
class AdminStats(BaseModel):
    total_users: int
    total_companies: int
    total_jobs: int
    total_applications: int
    open_jobs: int
