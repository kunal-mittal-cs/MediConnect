from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Notification
from ..dependencies import get_current_user


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


# =========================================================
# LIST NOTIFICATIONS
# =========================================================

@router.get("/")
def list_notifications(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Notification)
        .filter(
            Notification.user_id == user.id
        )
        .order_by(
            Notification.created_at.desc()
        )
        .limit(50)
        .all()
    )


# =========================================================
# UNREAD COUNT
# =========================================================

@router.get("/unread-count")
def unread(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == user.id,
            Notification.is_read == False,
        )
        .count()
    )

    return {
        "count": count
    }


# =========================================================
# MARK ONE AS READ
# =========================================================

@router.put("/{notification_id}/read")
def mark(
    notification_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == user.id,
        )
        .first()
    )

    if notification:
        notification.is_read = True
        db.commit()

    return {
        "ok": True
    }


# =========================================================
# MARK ALL AS READ
# =========================================================

@router.put("/read-all")
def read_all(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    (
        db.query(Notification)
        .filter(
            Notification.user_id == user.id,
            Notification.is_read == False,
        )
        .update(
            {
                Notification.is_read: True
            },
            synchronize_session=False,
        )
    )

    db.commit()

    return {
        "ok": True
    }