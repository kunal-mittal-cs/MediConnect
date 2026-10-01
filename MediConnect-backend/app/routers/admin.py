from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    User,
    DoctorProfile,
    DoctorService,
    Consultation,
    Payment,
    AppointmentRequest,
    Notification,
    PlatformSetting,
    ist_now,
)
from ..dependencies import require_role


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


# =========================================================
# HELPERS
# =========================================================

def period_start(period: str):
    period = period.lower()

    # IMPORTANT:
    # Database timestamps are stored using IST through ist_now().
    # Therefore period calculations must also use IST.
    now = ist_now()

    if period == "day":
        return datetime(
            now.year,
            now.month,
            now.day,
        )

    if period == "month":
        return datetime(
            now.year,
            now.month,
            1,
        )

    if period == "all":
        return None

    raise HTTPException(
        status_code=400,
        detail="Invalid period. Use day, month, or all.",
    )


def doctor_payload(doctor):
    return {
        "id": doctor.id,
        "user_id": doctor.user_id,
        "name": doctor.user.name,
        "email": doctor.user.email,
        "is_active": doctor.user.is_active,
        "specialization": doctor.specialization,
        "qualification": doctor.qualification,
        "experience": doctor.experience,
        "bio": doctor.bio,
        "consultation_fee": float(
            doctor.consultation_fee or 0
        ),
        "verification_status": (
            doctor.verification_status
        ),
        "is_available": doctor.is_available,
        "created_at": doctor.user.created_at,
    }


def patient_payload(patient):
    return {
        "id": patient.id,
        "name": patient.name,
        "email": patient.email,
        "is_active": patient.is_active,
        "created_at": patient.created_at,
    }


def consultation_payload(
    consultation,
    payment=None,
):
    doctor = consultation.doctor
    patient = consultation.patient
    service = consultation.service

    return {
        "id": consultation.id,

        "patient_id": consultation.patient_id,
        "patient_name": (
            patient.name
            if patient
            else "Patient"
        ),
        "patient_email": (
            patient.email
            if patient
            else None
        ),

        "doctor_id": consultation.doctor_id,
        "doctor_name": (
            doctor.user.name
            if doctor and doctor.user
            else "Doctor"
        ),
        "doctor_specialization": (
            doctor.specialization
            if doctor
            else None
        ),

        "service_id": consultation.service_id,
        "service_title": (
            service.title
            if service
            else "Consultation"
        ),
        "service_type": (
            service.service_type
            if service
            else None
        ),

        "amount": (
            float(payment.amount or 0)
            if payment
            else (
                float(service.price or 0)
                if service
                else 0
            )
        ),

        "payment_status": (
            payment.status
            if payment
            else "UNPAID"
        ),

        "platform_fee": (
            float(payment.platform_fee or 0)
            if payment
            else 0
        ),

        "doctor_amount": (
            float(payment.doctor_amount or 0)
            if payment
            else 0
        ),

        "transaction_id": (
            payment.transaction_id
            if payment
            else None
        ),

        "scheduled_at": consultation.scheduled_at,
        "ends_at": consultation.ends_at,
        "status": consultation.status,
        "meeting_link": consultation.meeting_link,
        "created_at": consultation.created_at,
    }


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


# =========================================================
# ADMIN DASHBOARD
# =========================================================

@router.get("/dashboard")
def dashboard(
    user=Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    # IMPORTANT:
    # Use IST because created_at values are stored using ist_now().
    now = ist_now()

    today_start = datetime(
        now.year,
        now.month,
        now.day,
    )

    month_start = datetime(
        now.year,
        now.month,
        1,
    )

    # -----------------------------------------------------
    # Users
    # -----------------------------------------------------

    total_patients = (
        db.query(User)
        .filter(User.role == "PATIENT")
        .count()
    )

    active_patients = (
        db.query(User)
        .filter(
            User.role == "PATIENT",
            User.is_active == True,
        )
        .count()
    )

    total_doctors = (
        db.query(DoctorProfile)
        .count()
    )

    verified_doctors = (
        db.query(DoctorProfile)
        .filter(
            DoctorProfile.verification_status
            == "VERIFIED"
        )
        .count()
    )

    pending_doctors = (
        db.query(DoctorProfile)
        .filter(
            DoctorProfile.verification_status
            == "PENDING"
        )
        .count()
    )

    # -----------------------------------------------------
    # Appointment requests
    # -----------------------------------------------------

    pending_requests = (
        db.query(AppointmentRequest)
        .filter(
            AppointmentRequest.status == "PENDING"
        )
        .count()
    )

    # -----------------------------------------------------
    # Consultations
    # -----------------------------------------------------

    total_consultations = (
        db.query(Consultation)
        .count()
    )

    completed_consultations = (
        db.query(Consultation)
        .filter(
            Consultation.status == "COMPLETED"
        )
        .count()
    )

    ongoing_consultations = (
        db.query(Consultation)
        .filter(
            Consultation.status == "ONGOING"
        )
        .count()
    )

    cancelled_consultations = (
        db.query(Consultation)
        .filter(
            Consultation.status == "CANCELLED"
        )
        .count()
    )

    # -----------------------------------------------------
    # Paid payments
    # -----------------------------------------------------

    paid_payments = (
        db.query(Payment)
        .filter(
            Payment.status == "PAID"
        )
        .all()
    )

    gross_revenue = round(
        sum(
            float(payment.amount or 0)
            for payment in paid_payments
        ),
        2,
    )

    platform_revenue = round(
        sum(
            float(payment.platform_fee or 0)
            for payment in paid_payments
        ),
        2,
    )

    doctor_payouts = round(
        sum(
            float(payment.doctor_amount or 0)
            for payment in paid_payments
        ),
        2,
    )

    paid_booking_count = len(
        paid_payments
    )

    # -----------------------------------------------------
    # Today's earnings
    # -----------------------------------------------------

    today_payments = (
        db.query(Payment)
        .filter(
            Payment.status == "PAID",
            Payment.created_at >= today_start,
        )
        .all()
    )

    today_platform_revenue = round(
        sum(
            float(payment.platform_fee or 0)
            for payment in today_payments
        ),
        2,
    )

    today_gross_revenue = round(
        sum(
            float(payment.amount or 0)
            for payment in today_payments
        ),
        2,
    )

    # -----------------------------------------------------
    # Monthly earnings
    # -----------------------------------------------------

    month_payments = (
        db.query(Payment)
        .filter(
            Payment.status == "PAID",
            Payment.created_at >= month_start,
        )
        .all()
    )

    month_platform_revenue = round(
        sum(
            float(payment.platform_fee or 0)
            for payment in month_payments
        ),
        2,
    )

    month_gross_revenue = round(
        sum(
            float(payment.amount or 0)
            for payment in month_payments
        ),
        2,
    )

    # -----------------------------------------------------
    # Current platform settings
    # -----------------------------------------------------

    settings = (
        db.query(PlatformSetting)
        .filter(
            PlatformSetting.id == 1
        )
        .first()
    )

    if settings:
        current_fee_percent = float(
            settings.platform_fee_percent or 0
        )
        current_fee_cap = float(
            settings.platform_fee_cap or 0
        )
    else:
        current_fee_percent = 10.0
        current_fee_cap = 100.0

    return {
        "users": {
            "total_patients": total_patients,
            "active_patients": active_patients,
        },

        "doctors": {
            "total": total_doctors,
            "verified": verified_doctors,
            "pending": pending_doctors,
        },

        "appointment_requests": {
            "pending": pending_requests,
        },

        "consultations": {
            "total": total_consultations,
            "completed": completed_consultations,
            "ongoing": ongoing_consultations,
            "cancelled": cancelled_consultations,
        },

        "payments": {
            "paid_bookings": paid_booking_count,
            "gross_revenue": gross_revenue,
            "platform_revenue": platform_revenue,
            "doctor_payouts": doctor_payouts,

            "today": {
                "gross_revenue": today_gross_revenue,
                "platform_revenue": today_platform_revenue,
                "paid_bookings": len(
                    today_payments
                ),
            },

            "month": {
                "gross_revenue": month_gross_revenue,
                "platform_revenue": month_platform_revenue,
                "paid_bookings": len(
                    month_payments
                ),
            },

            "platform_fee_rule": (
                f"{current_fee_percent:g}% per paid booking, "
                f"maximum ₹{current_fee_cap:g}"
            ),
        },
    }


# =========================================================
# DOCTORS
# =========================================================

@router.get("/doctors")
def doctors(
    status: str = "all",
    user=Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    query = db.query(DoctorProfile)

    status = status.upper()

    if status != "ALL":
        query = query.filter(
            DoctorProfile.verification_status
            == status
        )

    doctors_list = (
        query
        .order_by(
            DoctorProfile.id.desc()
        )
        .all()
    )

    return [
        doctor_payload(doctor)
        for doctor in doctors_list
    ]


# =========================================================
# DOCTOR SERVICES
# =========================================================

@router.get(
    "/doctors/{doctor_id}/services"
)
def get_doctor_services(
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

    services = (
        db.query(DoctorService)
        .filter(
            DoctorService.doctor_id
            == doctor_id
        )
        .order_by(
            DoctorService.id.asc()
        )
        .all()
    )

    return [
        service_payload(service)
        for service in services
    ]


@router.put(
    "/doctors/{doctor_id}/services/{service_id}"
)
def update_doctor_service(
    doctor_id: int,
    service_id: int,
    data: dict,
    user=Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    service = (
        db.query(DoctorService)
        .filter(
            DoctorService.id == service_id,
            DoctorService.doctor_id
            == doctor_id,
        )
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Doctor service not found",
        )

    # -----------------------------------------------------
    # Price
    # -----------------------------------------------------

    if "price" in data:
        try:
            price = float(
                data["price"]
            )
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Price must be a valid number."
                ),
            )

        if price < 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Price cannot be negative."
                ),
            )

        service.price = price

    # -----------------------------------------------------
    # Duration
    # -----------------------------------------------------

    if "duration_value" in data:
        try:
            duration_value = int(
                data["duration_value"]
            )
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Duration value must be a "
                    "valid number."
                ),
            )

        if duration_value <= 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Duration must be greater than 0."
                ),
            )

        service.duration_value = (
            duration_value
        )

    if "duration_unit" in data:
        duration_unit = str(
            data["duration_unit"]
        ).upper().strip()

        allowed_units = {
            "MINUTES",
            "HOURS",
            "DAYS",
        }

        if duration_unit not in allowed_units:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Duration unit must be "
                    "MINUTES, HOURS, or DAYS."
                ),
            )

        service.duration_unit = (
            duration_unit
        )

    # -----------------------------------------------------
    # Recalculate normalized duration
    # -----------------------------------------------------

    if (
        "duration_value" in data
        or "duration_unit" in data
    ):
        value = int(
            service.duration_value
        )

        unit = str(
            service.duration_unit
        ).upper()

        if unit == "MINUTES":
            service.duration_minutes = value

        elif unit == "HOURS":
            service.duration_minutes = (
                value * 60
            )

        elif unit == "DAYS":
            service.duration_minutes = (
                value * 24 * 60
            )

    # -----------------------------------------------------
    # Communication features
    # -----------------------------------------------------

    if "chat_enabled" in data:
        service.chat_enabled = bool(
            data["chat_enabled"]
        )

    if "voice_enabled" in data:
        service.voice_enabled = bool(
            data["voice_enabled"]
        )

    if "video_enabled" in data:
        service.video_enabled = bool(
            data["video_enabled"]
        )

    if "document_enabled" in data:
        service.document_enabled = bool(
            data["document_enabled"]
        )

    # -----------------------------------------------------
    # Active / inactive
    # -----------------------------------------------------

    if "is_active" in data:
        service.is_active = bool(
            data["is_active"]
        )

    db.commit()
    db.refresh(service)

    return {
        "ok": True,
        "message": (
            "Doctor service updated successfully."
        ),
        "service": service_payload(
            service
        ),
    }


# =========================================================
# DOCTOR VERIFICATION
# =========================================================

@router.put(
    "/doctors/{doctor_id}/verify"
)
def verify_doctor(
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

    doctor.verification_status = (
        "VERIFIED"
    )

    # Notification model does not contain
    # notification_type, so only use existing fields.
    db.add(
        Notification(
            user_id=doctor.user_id,
            title="Doctor profile verified",
            message=(
                "Your MediConnect doctor profile "
                "has been verified. You can now "
                "receive appointment requests."
            ),
        )
    )

    db.commit()
    db.refresh(doctor)

    return doctor_payload(doctor)


@router.put(
    "/doctors/{doctor_id}/reject"
)
def reject_doctor(
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

    doctor.verification_status = (
        "REJECTED"
    )

    db.add(
        Notification(
            user_id=doctor.user_id,
            title="Doctor profile rejected",
            message=(
                "Your MediConnect doctor profile "
                "has been rejected by the administrator."
            ),
        )
    )

    db.commit()
    db.refresh(doctor)

    return doctor_payload(doctor)


@router.put(
    "/doctors/{doctor_id}/status"
)
def doctor_status(
    doctor_id: int,
    active: bool,
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

    doctor.user.is_active = active

    if active:
        title = "Account activated"
        message = (
            "Your MediConnect account has been "
            "activated by the administrator."
        )
    else:
        title = "Account deactivated"
        message = (
            "Your MediConnect account has been "
            "deactivated by the administrator."
        )

    db.add(
        Notification(
            user_id=doctor.user_id,
            title=title,
            message=message,
        )
    )

    db.commit()
    db.refresh(doctor)

    return doctor_payload(doctor)


# =========================================================
# PATIENTS
# =========================================================

@router.get("/patients")
def patients(
    status: str = "all",
    user=Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    query = (
        db.query(User)
        .filter(
            User.role == "PATIENT"
        )
    )

    status = status.upper()

    if status == "ACTIVE":
        query = query.filter(
            User.is_active == True
        )

    elif status == "INACTIVE":
        query = query.filter(
            User.is_active == False
        )

    patients_list = (
        query
        .order_by(
            User.id.desc()
        )
        .all()
    )

    return [
        patient_payload(patient)
        for patient in patients_list
    ]


@router.put(
    "/patients/{patient_id}/status"
)
def patient_status(
    patient_id: int,
    active: bool,
    user=Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    patient = (
        db.query(User)
        .filter(
            User.id == patient_id,
            User.role == "PATIENT",
        )
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    patient.is_active = active

    if active:
        title = "Account activated"
        message = (
            "Your MediConnect account has been "
            "activated by the administrator."
        )
    else:
        title = "Account deactivated"
        message = (
            "Your MediConnect account has been "
            "deactivated by the administrator."
        )

    db.add(
        Notification(
            user_id=patient.id,
            title=title,
            message=message,
        )
    )

    db.commit()
    db.refresh(patient)

    return patient_payload(patient)


# =========================================================
# CONSULTATIONS
# =========================================================

@router.get("/consultations")
def consultations(
    status: str = "all",
    user=Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Consultation)
        .order_by(
            Consultation.created_at.desc()
        )
    )

    status = status.upper()

    if status != "ALL":
        query = query.filter(
            Consultation.status == status
        )

    consultation_list = query.all()

    result = []

    for consultation in consultation_list:
        payment = (
            db.query(Payment)
            .filter(
                Payment.consultation_id
                == consultation.id
            )
            .first()
        )

        result.append(
            consultation_payload(
                consultation,
                payment,
            )
        )

    return result


# =========================================================
# PAYMENTS
# =========================================================

@router.get("/payments")
def payments(
    period: str = "all",
    user=Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    start = period_start(period)

    query = (
        db.query(Payment)
        .filter(
            Payment.status == "PAID"
        )
        .order_by(
            Payment.created_at.desc()
        )
    )

    if start:
        query = query.filter(
            Payment.created_at >= start
        )

    payment_list = query.all()

    gross_revenue = round(
        sum(
            float(payment.amount or 0)
            for payment in payment_list
        ),
        2,
    )

    platform_revenue = round(
        sum(
            float(payment.platform_fee or 0)
            for payment in payment_list
        ),
        2,
    )

    doctor_payouts = round(
        sum(
            float(payment.doctor_amount or 0)
            for payment in payment_list
        ),
        2,
    )

    settings = (
        db.query(PlatformSetting)
        .filter(
            PlatformSetting.id == 1
        )
        .first()
    )

    if settings:
        fee_percent = float(
            settings.platform_fee_percent or 0
        )
        fee_cap = float(
            settings.platform_fee_cap or 0
        )
    else:
        fee_percent = 10.0
        fee_cap = 100.0

    transactions = []

    for payment in payment_list:
        consultation = (
            db.query(Consultation)
            .filter(
                Consultation.id
                == payment.consultation_id
            )
            .first()
        )

        if not consultation:
            continue

        doctor = consultation.doctor
        patient = consultation.patient
        service = consultation.service

        transactions.append(
            {
                "payment_id": payment.id,

                "transaction_id": (
                    payment.transaction_id
                ),

                "consultation_id": (
                    consultation.id
                ),

                "patient_name": (
                    patient.name
                    if patient
                    else "Patient"
                ),

                "doctor_name": (
                    doctor.user.name
                    if doctor
                    and doctor.user
                    else "Doctor"
                ),

                "service_title": (
                    service.title
                    if service
                    else "Consultation"
                ),

                "amount": float(
                    payment.amount or 0
                ),

                "platform_fee": float(
                    payment.platform_fee or 0
                ),

                "doctor_amount": float(
                    payment.doctor_amount or 0
                ),

                "payment_method": (
                    payment.payment_method
                ),

                "status": payment.status,

                "created_at": (
                    payment.created_at
                ),
            }
        )

    return {
        "period": period.lower(),
        "gross_revenue": gross_revenue,
        "platform_revenue": platform_revenue,
        "doctor_payouts": doctor_payouts,
        "paid_bookings": len(
            payment_list
        ),
        "platform_fee_rule": (
            f"{fee_percent:g}% per paid booking, "
            f"maximum ₹{fee_cap:g}"
        ),
        "transactions": transactions,
    }


# =========================================================
# SETTINGS
# =========================================================

@router.get("/settings")
def get_settings(
    user=Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    settings = (
        db.query(PlatformSetting)
        .filter(
            PlatformSetting.id == 1
        )
        .first()
    )

    if not settings:
        settings = PlatformSetting(
            id=1,
            platform_fee_percent=10.00,
            platform_fee_cap=100.00,
        )

        db.add(settings)
        db.commit()
        db.refresh(settings)

    return {
        "platform_fee_percent": float(
            settings.platform_fee_percent or 0
        ),
        "platform_fee_cap": float(
            settings.platform_fee_cap or 0
        ),
    }


@router.put("/settings")
def update_settings(
    data: dict,
    user=Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    settings = (
        db.query(PlatformSetting)
        .filter(
            PlatformSetting.id == 1
        )
        .first()
    )

    if not settings:
        settings = PlatformSetting(
            id=1,
            platform_fee_percent=10.00,
            platform_fee_cap=100.00,
        )

        db.add(settings)

    try:
        fee_percent = float(
            data.get(
                "platform_fee_percent",
                settings.platform_fee_percent,
            )
        )

        fee_cap = float(
            data.get(
                "platform_fee_cap",
                settings.platform_fee_cap,
            )
        )

    except (TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail=(
                "Platform fee values must "
                "be valid numbers."
            ),
        )

    if fee_percent < 0 or fee_percent > 100:
        raise HTTPException(
            status_code=400,
            detail=(
                "Platform fee must be between "
                "0% and 100%."
            ),
        )

    if fee_cap < 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "Maximum platform fee cannot "
                "be negative."
            ),
        )

    settings.platform_fee_percent = (
        fee_percent
    )

    settings.platform_fee_cap = (
        fee_cap
    )

    db.commit()
    db.refresh(settings)

    return {
        "ok": True,
        "message": (
            "Platform settings updated successfully."
        ),
        "platform_fee_percent": float(
            settings.platform_fee_percent
        ),
        "platform_fee_cap": float(
            settings.platform_fee_cap
        ),
    }