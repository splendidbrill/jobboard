from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from ..core.database import get_db
from ..core.auth import get_current_user, CurrentUser
from ..models.models import Notification, Company
from ..schemas import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=dict)
async def get_notifications(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notifications for company"""
    if current_user.role != "COMPANY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only companies can view notifications"
        )
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        return {"notifications": [], "unread_count": 0}
    
    notifications = db.query(Notification).filter(
        Notification.company_id == company.id
    ).order_by(Notification.created_at.desc()).limit(50).all()
    
    unread_count = db.query(Notification).filter(
        Notification.company_id == company.id,
        Notification.is_read == False
    ).count()
    
    # Add user info to notifications
    result = []
    for notif in notifications:
        notif_dict = NotificationResponse.model_validate(notif)
        result.append(notif_dict)
    
    return {"notifications": result, "unread_count": unread_count}


@router.put("/{notification_id}")
async def mark_notification_read(
    notification_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark notification as read"""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    notification.is_read = True
    db.commit()
    
    return {"success": True}


@router.put("/mark-all-read")
async def mark_all_notifications_read(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read"""
    if current_user.role != "COMPANY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only companies can manage notifications"
        )
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        return {"success": True}
    
    db.query(Notification).filter(
        Notification.company_id == company.id,
        Notification.is_read == False
    ).update({"is_read": True})
    
    db.commit()
    
    return {"success": True}
