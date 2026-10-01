from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import (
    User,
    DoctorProfile,
    DoctorService,
    DoctorAvailability,
    Consultation,
)
from ..schemas import (
    DoctorProfileIn,
    ServiceIn,
    AvailabilityIn,
    AvailabilityStatusIn,
)
from ..dependencies import get_current_user, require_role


router = APIRouter(
    prefix="/doctors",
    tags=["Doctors"],
)


# =========================================================
# HELPERS
# =========================================================

def doctor_for(user, db):
    doctor = (
        db.query(DoctorProfile)
        .filter(DoctorProfile.user_id == user.id)
        .first()
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor profile not found",
        )

    return doctor


def normalize_duration(value: int, unit: str) -> int:
    unit = unit.upper().strip()

    if value <= 0:
        raise HTTPException(
            status_code=400,
            detail="Duration must be greater than zero",
        )

    if unit == "MINUTES":
        minutes = value
    elif unit == "HOURS":
        minutes = value * 60
    elif unit == "DAYS":
        minutes = value * 24 * 60
    else:
        raise HTTPException(
            status_code=400,
            detail="Duration unit must be MINUTES, HOURS, or DAYS",
        )

    if minutes > 10080:
        raise HTTPException(
            status_code=400,
            detail="Maximum service duration is 7 days",
        )

    return minutes


def service_payload(service):
    return {
        "id": service.id,
        "doctor_id": service.doctor_id,
        "service_type": service.service_type,
        "title": service.title,
        "description": service.description,
        "price": float(service.price or 0),
        "duration_value": service.duration_value,
        "duration_unit": service.duration_unit,
        "duration_minutes": service.duration_minutes,
        "chat_enabled": service.chat_enabled,
        "voice_enabled": service.voice_enabled,
        "video_enabled": service.video_enabled,
        "document_enabled": service.document_enabled,
        "is_active": service.is_active,
    }


def doctor_payload(doctor):
    return {
        "id": doctor.id,
        "user_id": doctor.user_id,
        "name": doctor.user.name,
        "email": doctor.user.email,
        "specialization": doctor.specialization,
        "qualification": doctor.qualification,
        "experience": doctor.experience,
        "bio": doctor.bio,
        "consultation_fee": float(
            doctor.consultation_fee or 0
        ),
        "verification_status": doctor.verification_status,
        "is_available": doctor.is_available,
    }


def availability_payload(slot):
    return {
        "id": slot.id,
        "doctor_id": slot.doctor_id,
        "available_date": slot.available_date,
        "start_time": slot.start_time,
        "end_time": slot.end_time,
        "is_booked": slot.is_booked,
    }


# =========================================================
# DOCTOR PROFILE
# =========================================================

@router.post("/profile")
def create_profile(
    data: DoctorProfileIn,
    user=Depends(require_role("DOCTOR")),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(DoctorProfile)
        .filter(
            DoctorProfile.user_id == user.id
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Doctor profile already exists",
        )

    doctor = DoctorProfile(
        user_id=user.id,
        **data.model_dump(),
    )

    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    return doctor_payload(doctor)


@router.get("/profile")
def get_profile(
    user=Depends(require_role("DOCTOR")),
    db: Session = Depends(get_db),
):
    return doctor_payload(
        doctor_for(user, db)
    )


@router.put("/profile")
def update_profile(
    data: DoctorProfileIn,
    user=Depends(require_role("DOCTOR")),
    db: Session = Depends(get_db),
):
    doctor = doctor_for(user, db)

    for key, value in data.model_dump().items():
        setattr(doctor, key, value)

    db.commit()
    db.refresh(doctor)

    return doctor_payload(doctor)


# =========================================================
# PUBLIC DOCTOR PROFILE
# =========================================================

@router.get("/{doctor_id}/profile")
def public_profile(
    doctor_id: int,
    db: Session = Depends(get_db),
):
    doctor = (
        db.query(DoctorProfile)
        .filter(
            DoctorProfile.id == doctor_id,
            DoctorProfile.verification_status == "VERIFIED",
        )
        .first()
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found",
        )

    return doctor_payload(doctor)


# =========================================================
# SERVICES
# =========================================================

@router.post("/services")
def add_service(
    data: ServiceIn,
    user=Depends(require_role("DOCTOR")),
    db: Session = Depends(get_db),
):
    doctor = doctor_for(user, db)

    duration_minutes = normalize_duration(
        data.duration_value,
        data.duration_unit,
    )

    service = DoctorService(
        doctor_id=doctor.id,
        service_type=data.service_type,
        title=data.title,
        description=data.description,
        price=data.price,
        duration_value=data.duration_value,
        duration_unit=data.duration_unit.upper(),
        duration_minutes=duration_minutes,
        chat_enabled=data.chat_enabled,
        voice_enabled=data.voice_enabled,
        video_enabled=data.video_enabled,
        document_enabled=data.document_enabled,
    )

    db.add(service)
    db.commit()
    db.refresh(service)

    return service_payload(service)


@router.get("/services")
def services(
    doctor_id: int | None = None,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if doctor_id is None:
        doctor_id = doctor_for(user, db).id

    query = (
        db.query(DoctorService)
        .filter(
            DoctorService.doctor_id == doctor_id,
            DoctorService.is_active == True,
        )
        .order_by(
            DoctorService.id.asc()
        )
    )

    return [
        service_payload(service)
        for service in query.all()
    ]


@router.put("/services/{service_id}")
def update_service(
    service_id: int,
    data: ServiceIn,
    user=Depends(require_role("DOCTOR")),
    db: Session = Depends(get_db),
):
    doctor = doctor_for(user, db)

    service = (
        db.query(DoctorService)
        .filter(
            DoctorService.id == service_id,
            DoctorService.doctor_id == doctor.id,
        )
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found",
        )

    duration_minutes = normalize_duration(
        data.duration_value,
        data.duration_unit,
    )

    service.service_type = data.service_type
    service.title = data.title
    service.description = data.description
    service.price = data.price
    service.duration_value = data.duration_value
    service.duration_unit = data.duration_unit.upper()
    service.duration_minutes = duration_minutes
    service.chat_enabled = data.chat_enabled
    service.voice_enabled = data.voice_enabled
    service.video_enabled = data.video_enabled
    service.document_enabled = data.document_enabled

    db.commit()
    db.refresh(service)

    return service_payload(service)


@router.delete("/services/{service_id}")
def delete_service(
    service_id: int,
    user=Depends(require_role("DOCTOR")),
    db: Session = Depends(get_db),
):
    doctor = doctor_for(user, db)

    service = (
        db.query(DoctorService)
        .filter(
            DoctorService.id == service_id,
            DoctorService.doctor_id == doctor.id,
        )
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found",
        )

    service.is_active = False

    db.commit()

    return {
        "ok": True,
        "message": "Service deactivated",
    }


# =========================================================
# AVAILABILITY
# =========================================================

@router.post("/availability")
def add_availability(
    data: AvailabilityIn,
    user=Depends(require_role("DOCTOR")),
    db: Session = Depends(get_db),
):
    doctor = doctor_for(user, db)

    existing_slots = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_id == doctor.id,
            DoctorAvailability.available_date
            == data.available_date,
        )
        .all()
    )

    for slot in existing_slots:
        if (
            data.start_time < slot.end_time
            and data.end_time > slot.start_time
        ):
            raise HTTPException(
                status_code=409,
                detail="This availability overlaps an existing slot",
            )

    slot = DoctorAvailability(
        doctor_id=doctor.id,
        available_date=data.available_date,
        start_time=data.start_time,
        end_time=data.end_time,
    )

    db.add(slot)

    doctor.is_available = True

    db.commit()
    db.refresh(slot)

    return availability_payload(slot)


@router.get("/availability")
def availability(
    user=Depends(require_role("DOCTOR")),
    db: Session = Depends(get_db),
):
    doctor = doctor_for(user, db)

    slots = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_id == doctor.id,
        )
        .order_by(
            DoctorAvailability.available_date.asc(),
            DoctorAvailability.start_time.asc(),
        )
        .all()
    )

    return [
        availability_payload(slot)
        for slot in slots
    ]


@router.delete("/availability/{availability_id}")
def delete_availability(
    availability_id: int,
    user=Depends(require_role("DOCTOR")),
    db: Session = Depends(get_db),
):
    doctor = doctor_for(user, db)

    slot = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.id == availability_id,
            DoctorAvailability.doctor_id == doctor.id,
        )
        .first()
    )

    if not slot:
        raise HTTPException(
            status_code=404,
            detail="Availability slot not found",
        )

    consultations = (
        db.query(Consultation)
        .filter(
            Consultation.doctor_id == doctor.id,
            Consultation.scheduled_at.isnot(None),
            Consultation.scheduled_at
            >= datetime.combine(
                slot.available_date,
                slot.start_time,
            ),
            Consultation.scheduled_at
            < datetime.combine(
                slot.available_date,
                slot.end_time,
            ),
            Consultation.status.in_(
                [
                    "PENDING",
                    "CONFIRMED",
                    "ONGOING",
                ]
            ),
        )
        .count()
    )

    if consultations > 0:
        raise HTTPException(
            status_code=409,
            detail="This availability contains a scheduled consultation",
        )

    db.delete(slot)

    remaining = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_id == doctor.id,
        )
        .count()
    )

    if remaining == 0:
        doctor.is_available = False

    db.commit()

    return {
        "ok": True,
        "message": "Availability removed",
    }


@router.put("/availability/status")
def status(
    data: AvailabilityStatusIn,
    user=Depends(require_role("DOCTOR")),
    db: Session = Depends(get_db),
):
    doctor = doctor_for(user, db)

    doctor.is_available = data.is_available

    db.commit()

    return {
        "is_available": doctor.is_available
    }


# =========================================================
# AVAILABLE BOOKING SLOTS
# =========================================================

@router.get("/{doctor_id}/available-slots")
def available_slots(
    doctor_id: int,
    date_value: str,
    service_id: int,
    db: Session = Depends(get_db),
):
    """
    Return available appointment slots.

    date_value:
        YYYY-MM-DD

    Response:
        [
            {
                "start_time": "14:00:00",
                "end_time": "14:30:00"
            }
        ]
    """

    try:
        requested_date = datetime.strptime(
            date_value,
            "%Y-%m-%d",
        ).date()
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="date_value must use YYYY-MM-DD format",
        )

    doctor = (
        db.query(DoctorProfile)
        .filter(
            DoctorProfile.id == doctor_id,
            DoctorProfile.verification_status
            == "VERIFIED",
            DoctorProfile.is_available == True,
        )
        .first()
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found or unavailable",
        )

    service = (
        db.query(DoctorService)
        .filter(
            DoctorService.id == service_id,
            DoctorService.doctor_id == doctor_id,
            DoctorService.is_active == True,
        )
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found",
        )

    availability_rows = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_id == doctor_id,
            DoctorAvailability.available_date
            == requested_date,
        )
        .order_by(
            DoctorAvailability.start_time.asc()
        )
        .all()
    )

    if not availability_rows:
        return []

    consultations = (
        db.query(Consultation)
        .filter(
            Consultation.doctor_id == doctor_id,
            Consultation.scheduled_at.isnot(None),
            Consultation.status.in_(
                [
                    "PENDING",
                    "CONFIRMED",
                    "ONGOING",
                ]
            ),
        )
        .all()
    )

    duration_minutes = int(
        service.duration_minutes or 30
    )

    duration = timedelta(
        minutes=duration_minutes
    )

    # Patient-facing slots are generated every 30 minutes.
    slot_step = timedelta(minutes=30)

    results = []

    for availability_row in availability_rows:

        window_start = datetime.combine(
            requested_date,
            availability_row.start_time,
        )

        window_end = datetime.combine(
            requested_date,
            availability_row.end_time,
        )

        current = window_start

        while current + duration <= window_end:

            proposed_end = (
                current + duration
            )

            conflict = False

            for consultation in consultations:

                existing_start = (
                    consultation.scheduled_at
                )

                if consultation.ends_at:
                    existing_end = (
                        consultation.ends_at
                    )
                else:
                    existing_end = (
                        existing_start
                        + timedelta(
                            minutes=int(
                                consultation.service.duration_minutes
                                or 30
                            )
                        )
                    )

                if (
                    current < existing_end
                    and proposed_end > existing_start
                ):
                    conflict = True
                    break

            if not conflict:
                results.append(
                    {
                        "start_time": current.strftime(
                            "%H:%M:%S"
                        ),
                        "end_time": proposed_end.strftime(
                            "%H:%M:%S"
                        ),
                    }
                )

            current += slot_step

    return results


# =========================================================
# ADMIN
# =========================================================

@router.put("/{doctor_id}/verify")
def verify(
    doctor_id: int,
    user=Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    doctor = (
        db.query(DoctorProfile)
        .filter(
            DoctorProfile.id == doctor_id
        )
        .first()
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found",
        )

    doctor.verification_status = "VERIFIED"

    db.commit()

    return doctor_payload(doctor)


@router.get("/admin/all")
def admin_all(
    user=Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    doctors = (
        db.query(DoctorProfile)
        .order_by(
            DoctorProfile.id.desc()
        )
        .all()
    )

    return [
        doctor_payload(doctor)
        for doctor in doctors
    ]


# =========================================================
# DISCOVERY
# =========================================================

@router.get("/discover")
def discover(
    specialization: str | None = None,
    available_only: bool = True,
    db: Session = Depends(get_db),
):
    query = (
        db.query(DoctorProfile)
        .options(
            joinedload(DoctorProfile.user)
        )
        .join(User)
        .filter(
            DoctorProfile.verification_status == "VERIFIED",
            User.is_active == True,
        )
    )

    if available_only:
        query = query.filter(
            DoctorProfile.is_available == True
        )

    if specialization:
        query = query.filter(
            DoctorProfile.specialization.ilike(
                f"%{specialization}%"
            )
        )

    doctors = (
        query
        .order_by(
            DoctorProfile.id.desc()
        )
        .all()
    )

    return [
        doctor_payload(doctor)
        for doctor in doctors
    ]