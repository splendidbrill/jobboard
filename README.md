# JobConnect - Full Stack Job Board

A modern job board application with Next.js frontend, FastAPI backend, and Supabase authentication.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 15    │     │   FastAPI       │     │   Supabase      │
│   Frontend      │────▶│   Backend       │────▶│   Auth & DB     │
│   (Port 3000)   │     │   (Port 8000)   │     │   (Cloud)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+ & Bun
- Python 3.11+
- Supabase account

### 1. Setup Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Enable Google OAuth in Authentication > Providers
3. Get credentials from Settings > API:
   - Project URL
   - Anon/Public Key
   - JWT Secret
   - Database URL (Settings > Database > Connection string)

### 2. Setup Frontend

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000

# Install and run
bun install
bun run dev
```

### 3. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your credentials

# Run the server
uvicorn app.main:app --reload --port 8000
```

### 4. Create Super Admin

In Supabase SQL Editor, run:

```sql
-- Create super admin user
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@jobboard.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  '{"role": "SUPER_ADMIN"}',
  '{"full_name": "Super Admin"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);
```

## Features

### User Types
- **Job Seekers**: Profile, resume upload, job applications
- **Companies**: Company profile, post jobs, manage applications
- **Super Admin**: Manage all users and companies

### Authentication
- Email/Password signup and login
- Google OAuth
- Secure JWT token verification

### Job Search
- Search by keywords, profession, location
- Filter by job type, work mode (remote/hybrid/onsite)
- Apply to jobs with cover letter and resume

### Company Features
- Post and manage job listings
- View candidate applications
- Update application status
- Receive notifications

### Admin Features
- View statistics dashboard
- View companies sorted by country/city
- View users sorted by country/city
- Delete users or companies

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- React 19
- Tailwind CSS
- shadcn/ui components
- Supabase client SDK
- Framer Motion animations

### Backend
- FastAPI
- SQLAlchemy ORM
- Pydantic schemas
- JWT authentication
- PostgreSQL (via Supabase)

### Auth & Database
- Supabase Auth (Google OAuth, Email/Password)
- Supabase PostgreSQL

## API Documentation

Once the backend is running:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@jobboard.com | admin123 |

## Project Structure

```
/home/z/my-project/
├── src/                    # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # UI components
│   └── lib/              # Utilities, auth, API
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Config, database, auth
│   │   ├── models/       # SQLAlchemy models
│   │   └── schemas/      # Pydantic schemas
│   └── requirements.txt
└── README.md
```

## Environment Variables

### Frontend (.env)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)
```
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_JWT_SECRET=xxx
```

## License

MIT
