from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base
import enum


class UserRole(str, enum.Enum):
    JOB_SEEKER = "JOB_SEEKER"
    COMPANY = "COMPANY"
    SUPER_ADMIN = "SUPER_ADMIN"


class WorkMode(str, enum.Enum):
    REMOTE = "REMOTE"
    HYBRID = "HYBRID"
    ONSITE = "ONSITE"


class JobType(str, enum.Enum):
    FULL_TIME = "FULL_TIME"
    PART_TIME = "PART_TIME"
    CONTRACT = "CONTRACT"
    INTERNSHIP = "INTERNSHIP"
    FREELANCE = "FREELANCE"


class JobStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    FILLED = "FILLED"


class ApplicationStatus(str, enum.Enum):
    PENDING = "PENDING"
    REVIEWING = "REVIEWING"
    INTERVIEWED = "INTERVIEWED"
    REJECTED = "REJECTED"
    ACCEPTED = "ACCEPTED"
    WITHDRAWN = "WITHDRAWN"


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)  # Supabase Auth User ID
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.JOB_SEEKER, nullable=False)
    
    # Profile fields
    profile_picture = Column(String, nullable=True)
    headline = Column(String, nullable=True)
    summary = Column(Text, nullable=True)
    
    # Location
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    address = Column(String, nullable=True)
    
    # Job Seeker specific
    skills = Column(Text, nullable=True)  # JSON string array
    experience = Column(String, nullable=True)
    education = Column(Text, nullable=True)  # JSON string array
    resume = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="user", uselist=False)
    applications = relationship("Application", back_populates="user")
    notifications = relationship("Notification", back_populates="user")


class Company(Base):
    __tablename__ = "companies"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    company_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    website = Column(String, nullable=True)
    logo = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    company_size = Column(String, nullable=True)
    founded_year = Column(Integer, nullable=True)
    
    # Location
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    address = Column(String, nullable=True)
    
    # Status
    is_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="company")
    jobs = relationship("Job", back_populates="company")


class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(String, primary_key=True, index=True)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=True)  # JSON string array
    responsibilities = Column(Text, nullable=True)  # JSON string array
    
    # Location
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    work_mode = Column(SQLEnum(WorkMode), default=WorkMode.ONSITE)
    
    # Compensation
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    salary_currency = Column(String, default="USD")
    salary_period = Column(String, default="yearly")
    
    # Job Details
    job_type = Column(SQLEnum(JobType), default=JobType.FULL_TIME)
    experience_level = Column(String, nullable=True)
    skills = Column(Text, nullable=True)  # JSON string array
    
    # Status
    status = Column(SQLEnum(JobStatus), default=JobStatus.OPEN)
    application_deadline = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="jobs")
    applications = relationship("Application", back_populates="job")


class Application(Base):
    __tablename__ = "applications"
    
    id = Column(String, primary_key=True, index=True)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    cover_letter = Column(Text, nullable=True)
    resume = Column(String, nullable=True)
    
    status = Column(SQLEnum(ApplicationStatus), default=ApplicationStatus.PENDING)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    job = relationship("Job", back_populates="applications")
    user = relationship("User", back_populates="applications")


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True, index=True)
    company_id = Column(String, nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String, default="APPLICATION")
    related_id = Column(String, nullable=True)
    
    is_read = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="notifications")
