from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    User,
    AppointmentRequest,
    DoctorProfile,
    Notification,
    Consultation,
    DoctorService,
)
from ..schemas import AppointmentIn
from ..dependencies import require_role


router = APIRouter(
    prefix="/appointment-requests",
    tags=["Appointment Requests"],
)


# =========================================================
# PATIENT — CREATE REQUEST
# =========================================================

@router.post("/")
def create(
    data: AppointmentIn,
    user=Depends(require_role("PATIENT")),
    db: Session = Depends(get_db),
):
    request = AppointmentRequest(
        patient_id=user.id,
        **data.model_dump(),
    )

    db.add(request)
    db.commit()
    db.refresh(request)

    # -----------------------------------------------------
    # Notify all active admins about the new request
    # -----------------------------------------------------

    admins = (
        db.query(User)
        .filter(
            User.role == "ADMIN",
            User.is_active == True,
        )
        .all()
    )

    for admin in admins:
        db.add(
            Notification(
                user_id=admin.id,
                title="New appointment request",
                message=(
                    f"{user.name} submitted appointment request "
                    f"#{request.id} for {request.specialization}."
                ),
                
            )
        )

    db.commit()

    return request


# =========================================================
# PATIENT — MY REQUESTS
# =========================================================

@router.get("/my")
def mine(
    user=Depends(require_role("PATIENT")),
    db: Session = Depends(get_db),
):
    return (
        db.query(AppointmentRequest)
        .filter(
            AppointmentRequest.patient_id == user.id
        )
        .order_by(
            AppointmentRequest.created_at.desc()
        )
        .all()
    )


# =========================================================
# ADMIN — PENDING REQUESTS
# =========================================================

@router.get("/pending")
def pending(
    user=Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    return (
        db.query(AppointmentRequest)
        .filter(
            AppointmentRequest.status == "PENDING"
        )
        .order_by(
            AppointmentRequest.created_at.asc()
        )
        .all()
    )


# =========================================================
# ADMIN — ASSIGN DOCTOR
# =========================================================

@router.put("/{request_id}/assign/{doctor_id}")
def assign(
    request_id: int,
    doctor_id: int,
    user=Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    request = (
        db.query(AppointmentRequest)
        .filter(
            AppointmentRequest.id == request_id
        )
        .first()
    )

    doctor = (
        db.query(DoctorProfile)
        .filter(
            DoctorProfile.id == doctor_id,
            DoctorProfile.verification_status == "VERIFIED",
        )
        .first()
    )

    if not request or not doctor:
        raise HTTPException(
            status_code=404,
            detail="Request or verified doctor not found",
        )

    if request.status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail="Only pending requests can be assigned",
        )

    request_specialization = (
        request.specialization.lower().strip()
    )

    doctor_specialization = (
        doctor.specialization.lower().strip()
    )

    if (
        request_specialization not in doctor_specialization
        and doctor_specialization not in request_specialization
    ):
        raise HTTPException(
            status_code=400,
            detail="Doctor specialization does not match request",
        )

    request.assigned_doctor_id = doctor.id
    request.status = "ASSIGNED"

    # -----------------------------------------------------
    # Notify doctor
    # -----------------------------------------------------

    db.add(
        Notification(
            user_id=doctor.user_id,
            title="New appointment request",
            message=(
                f"Appointment request #{request.id} "
                f"was assigned to you."
            ),
            
        )
    )

    # -----------------------------------------------------
    # Notify patient
    # -----------------------------------------------------

    db.add(
        Notification(
            user_id=request.patient_id,
            title="Doctor assigned",
            message=(
                f"A doctor has been assigned to "
                f"appointment request #{request.id}."
            ),
            
        )
    )

    db.commit()

    return request


# =========================================================
# DOCTOR — MY ASSIGNED REQUESTS
# =========================================================

@router.get("/doctor/my")
def doctor_my(
    user=Depends(require_role("DOCTOR")),
    db: Session = Depends(get_db),
):
    doctor = (
        db.query(DoctorProfile)
        .filter(
            DoctorProfile.user_id == user.id
        )
        .first()
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor profile not found",
        )

    return (
        db.query(AppointmentRequest)
        .filter(
            AppointmentRequest.assigned_doctor_id
            == doctor.id
        )
        .order_by(
            AppointmentRequest.created_at.desc()
        )
        .all()
    )


# =========================================================
# DOCTOR — ACCEPT REQUEST
# =========================================================

@router.put("/{request_id}/accept")
def accept(
    request_id: int,
    user=Depends(require_role("DOCTOR")),
    db: Session = Depends(get_db),
):
    doctor = (
        db.query(DoctorProfile)
        .filter(
            DoctorProfile.user_id == user.id
        )
        .first()
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor profile not found",
        )

    request = (
        db.query(AppointmentRequest)
        .filter(
            AppointmentRequest.id == request_id,
            AppointmentRequest.assigned_doctor_id
            == doctor.id,
        )
        .first()
    )

    if not request:
        raise HTTPException(
            status_code=404,
            detail="Assigned request not found",
        )

    if request.status != "ASSIGNED":
        raise HTTPException(
            status_code=400,
            detail="Only assigned requests can be accepted",
        )

    # -----------------------------------------------------
    # Find a suitable active service
    # -----------------------------------------------------

    service = (
        db.query(DoctorService)
        .filter(
            DoctorService.doctor_id == doctor.id,
            DoctorService.is_active == True,
        )
        .order_by(
            DoctorService.id.asc()
        )
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=400,
            detail=(
                "You need at least one active consultation "
                "service before accepting requests"
            ),
        )

    scheduled_at = datetime.combine(
        request.preferred_date,
        request.preferred_time,
    )

    # -----------------------------------------------------
    # Check whether requested time fits availability
    # -----------------------------------------------------

    from ..models import DoctorAvailability

    availability = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_id == doctor.id,
            DoctorAvailability.available_date
            == request.preferred_date,
        )
        .all()
    )

    consultation_end = (
        scheduled_at
        + timedelta(
            minutes=service.duration_minutes
        )
    )

    fits_availability = False

    for slot in availability:
        slot_start = datetime.combine(
            slot.available_date,
            slot.start_time,
        )

        slot_end = datetime.combine(
            slot.available_date,
            slot.end_time,
        )

        if (
            scheduled_at >= slot_start
            and consultation_end <= slot_end
        ):
            fits_availability = True
            break

    if not fits_availability:
        raise HTTPException(
            status_code=409,
            detail=(
                "The requested appointment time is "
                "outside your availability"
            ),
        )

    # -----------------------------------------------------
    # Check overlapping consultations
    # -----------------------------------------------------

    existing = (
        db.query(Consultation)
        .filter(
            Consultation.doctor_id == doctor.id,
            Consultation.status.in_(
                ["PENDING", "CONFIRMED", "ONGOING"]
            ),
            Consultation.scheduled_at.isnot(None),
        )
        .all()
    )

    for consultation in existing:

        existing_start = consultation.scheduled_at

        existing_end = consultation.ends_at

        if not existing_end:
            existing_end = (
                existing_start
                + timedelta(
                    minutes=consultation.service.duration_minutes
                )
            )

        if (
            scheduled_at < existing_end
            and consultation_end > existing_start
        ):
            raise HTTPException(
                status_code=409,
                detail="The requested appointment time is already booked",
            )

    # -----------------------------------------------------
    # Create real consultation
    # -----------------------------------------------------

    consultation = Consultation(
        patient_id=request.patient_id,
        doctor_id=doctor.id,
        service_id=service.id,
        scheduled_at=scheduled_at,
        ends_at=consultation_end,
        status="CONFIRMED",
    )

    db.add(consultation)

    request.status = "ACCEPTED"

    # -----------------------------------------------------
    # Notify patient
    # -----------------------------------------------------

    db.add(
        Notification(
            user_id=request.patient_id,
            title="Appointment accepted",
            message=(
                f"Your appointment request #{request.id} "
                f"was accepted by Dr. {doctor.user.name}."
            ),
            
        )
    )

    db.commit()
    db.refresh(consultation)

    return {
        "request": request,
        "consultation": {
            "id": consultation.id,
            "scheduled_at": consultation.scheduled_at,
            "ends_at": consultation.ends_at,
            "status": consultation.status,
            "service_id": consultation.service_id,
        },
    }


# =========================================================
# DOCTOR — REJECT REQUEST
# =========================================================

@router.put("/{request_id}/reject")
def reject(
    request_id: int,
    user=Depends(require_role("DOCTOR")),
    db: Session = Depends(get_db),
):
    doctor = (
        db.query(DoctorProfile)
        .filter(
            DoctorProfile.user_id == user.id
        )
        .first()
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor profile not found",
        )

    request = (
        db.query(AppointmentRequest)
        .filter(
            AppointmentRequest.id == request_id,
            AppointmentRequest.assigned_doctor_id
            == doctor.id,
        )
        .first()
    )

    if not request:
        raise HTTPException(
            status_code=404,
            detail="Assigned request not found",
        )

    if request.status != "ASSIGNED":
        raise HTTPException(
            status_code=400,
            detail="Only assigned requests can be rejected",
        )

    request.status = "REJECTED"

    # -----------------------------------------------------
    # Notify patient
    # -----------------------------------------------------

    db.add(
        Notification(
            user_id=request.patient_id,
            title="Appointment request update",
            message=(
                f"Your appointment request #{request.id} "
                f"was rejected."
            ),
            
        )
    )

    db.commit()

    return request