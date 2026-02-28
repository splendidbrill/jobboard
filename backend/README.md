# JobConnect Backend - FastAPI + Supabase

A modern job board backend built with FastAPI, SQLAlchemy, and Supabase authentication.

## Features

- **FastAPI** - Modern, fast web framework for building APIs
- **SQLAlchemy** - SQL toolkit and ORM
- **Supabase Auth** - Authentication with Google OAuth and email/password
- **JWT Verification** - Secure token-based authentication
- **PostgreSQL** - Production-ready database (via Supabase)

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── users.py        # User endpoints
│   │   ├── companies.py    # Company endpoints
│   │   ├── jobs.py         # Job endpoints
│   │   ├── applications.py # Application endpoints
│   │   ├── notifications.py# Notification endpoints
│   │   └── admin.py        # Admin endpoints
│   ├── core/
│   │   ├── config.py       # Configuration settings
│   │   ├── database.py     # Database connection
│   │   └── auth.py         # Supabase JWT authentication
│   ├── models/
│   │   └── models.py       # SQLAlchemy models
│   ├── schemas/
│   │   └── schemas.py      # Pydantic schemas
│   └── main.py             # FastAPI application
├── requirements.txt
└── .env.example
```

## Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key from Settings > API
3. Get your JWT secret from Settings > API > JWT Settings

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string from Supabase
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `SUPABASE_JWT_SECRET` - JWT secret for token verification

### 3. Setup Database

The database tables will be created automatically when you start the server.

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Run the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or run directly:
```bash
python -m app.main
```

## API Endpoints

### Authentication
All protected endpoints require Bearer token in Authorization header.

### Users
- `POST /users/` - Create user (called after Supabase signup)
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update current user profile
- `GET /users/{user_id}` - Get user by ID
- `DELETE /users/{user_id}` - Delete user (admin)

### Companies
- `GET /companies/` - List all companies
- `POST /companies/` - Create company profile
- `GET /companies/me` - Get my company profile
- `GET /companies/{company_id}` - Get company by ID
- `PUT /companies/{company_id}` - Update company
- `DELETE /companies/{company_id}` - Delete company (admin)

### Jobs
- `GET /jobs/` - List jobs with filters
- `POST /jobs/` - Create job posting
- `GET /jobs/my-jobs` - Get my job postings
- `GET /jobs/{job_id}` - Get job by ID
- `PUT /jobs/{job_id}` - Update job
- `DELETE /jobs/{job_id}` - Delete job

### Applications
- `GET /applications/` - List applications
- `POST /applications/` - Apply to job
- `GET /applications/{application_id}` - Get application
- `PUT /applications/{application_id}` - Update application status
- `DELETE /applications/{application_id}` - Delete application

### Notifications
- `GET /notifications/` - Get company notifications
- `PUT /notifications/{notification_id}` - Mark as read
- `PUT /notifications/mark-all-read` - Mark all as read

### Admin
- `GET /admin/stats` - Dashboard statistics
- `GET /admin/companies` - List companies (grouped by location)
- `GET /admin/users` - List users (grouped by location)
- `DELETE /admin/users/{user_id}` - Delete user
- `DELETE /admin/companies/{company_id}` - Delete company

## Supabase Setup for Google OAuth

1. Go to Authentication > Providers in Supabase dashboard
2. Enable Google provider
3. Add your Google OAuth credentials
4. Set redirect URL to: `http://localhost:3000/auth/callback`

## Setting User Roles

User roles are stored in Supabase `app_metadata`. You can set roles:

1. Via Supabase SQL Editor:
```sql
update auth.users 
set raw_app_meta_data = jsonb_set(
  coalesce(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"COMPANY"'::jsonb
)
where email = 'user@example.com';
```

2. Or use Supabase Edge Functions for dynamic role assignment.

## Development

```bash
# Run with auto-reload
uvicorn app.main:app --reload

# Run tests
pytest

# Format code
black app/
```

## API Documentation

FastAPI provides automatic API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
