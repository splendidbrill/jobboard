from .users import router as users_router
from .companies import router as companies_router
from .jobs import router as jobs_router
from .applications import router as applications_router
from .notifications import router as notifications_router
from .admin import router as admin_router

__all__ = [
    "users_router",
    "companies_router",
    "jobs_router",
    "applications_router",
    "notifications_router",
    "admin_router"
]
