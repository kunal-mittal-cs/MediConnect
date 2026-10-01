from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
)
from sqlalchemy.orm import relationship

from .database import Base


# =========================================================
# IST TIMESTAMP HELPER
# =========================================================
# Database stores naive DateTime values.
# We explicitly convert the current time to IST first,
# then remove the timezone information before storing it.

IST = ZoneInfo("Asia/Kolkata")


def ist_now():
    return datetime.now(IST).replace(tzinfo=None)


# =========================================================
# USER
# =========================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)

    name = Column(
        String(100),
        nullable=False,
    )

    email = Column(
        String(150),
        unique=True,
        nullable=False,
        index=True,
    )

    password_hash = Column(
        String(255),
        nullable=False,
    )

    role = Column(
        String(20),
        nullable=False,
        default="PATIENT",
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=ist_now,
        nullable=False,
    )


# =========================================================
# DOCTOR PROFILE
# =========================================================

class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(
        Integer,
        primary_key=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=False,
    )

    specialization = Column(
        String(100),
        nullable=False,
    )

    qualification = Column(
        String(255),
        nullable=False,
    )

    experience = Column(
        Integer,
        default=0,
        nullable=False,
    )

    bio = Column(
        Text,
        default="",
    )

    consultation_fee = Column(
        Numeric(10, 2),
        default=0,
    )

    verification_status = Column(
        String(20),
        default="PENDING",
        nullable=False,
    )

    is_available = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    user = relationship(
        "User",
    )

    services = relationship(
        "DoctorService",
        back_populates="doctor",
        cascade="all, delete-orphan",
    )

    availability = relationship(
        "DoctorAvailability",
        back_populates="doctor",
        cascade="all, delete-orphan",
    )


# =========================================================
# DOCTOR SERVICES
# =========================================================

class DoctorService(Base):
    __tablename__ = "doctor_services"

    id = Column(
        Integer,
        primary_key=True,
    )

    doctor_id = Column(
        Integer,
        ForeignKey("doctor_profiles.id"),
        nullable=False,
        index=True,
    )

    service_type = Column(
        String(40),
        nullable=False,
    )

    title = Column(
        String(150),
        nullable=False,
    )

    description = Column(
        Text,
        default="",
    )

    price = Column(
        Numeric(10, 2),
        default=0,
    )

    # Flexible duration system.
    #
    # Examples:
    # 30 MINUTES
    # 45 MINUTES
    # 1 HOUR
    # 2 HOURS
    # 1 DAY
    # 7 DAYS
    duration_value = Column(
        Integer,
        default=30,
        nullable=False,
    )

    duration_unit = Column(
        String(20),
        default="MINUTES",
        nullable=False,
    )

    # Normalized duration used by scheduling logic.
    duration_minutes = Column(
        Integer,
        default=30,
        nullable=False,
    )

    chat_enabled = Column(
        Boolean,
        default=True,
        nullable=False,
    )

    voice_enabled = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    video_enabled = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    document_enabled = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
    )

    doctor = relationship(
        "DoctorProfile",
        back_populates="services",
    )


# =========================================================
# DOCTOR AVAILABILITY
# =========================================================

class DoctorAvailability(Base):
    __tablename__ = "doctor_availability"

    id = Column(
        Integer,
        primary_key=True,
    )

    doctor_id = Column(
        Integer,
        ForeignKey("doctor_profiles.id"),
        nullable=False,
        index=True,
    )

    available_date = Column(
        Date,
        nullable=False,
    )

    start_time = Column(
        Time,
        nullable=False,
    )

    end_time = Column(
        Time,
        nullable=False,
    )

    is_booked = Column(
        Boolean,
        default=False,
    )

    doctor = relationship(
        "DoctorProfile",
        back_populates="availability",
    )


# =========================================================
# CONSULTATION
# =========================================================

class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(
        Integer,
        primary_key=True,
    )

    patient_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    doctor_id = Column(
        Integer,
        ForeignKey("doctor_profiles.id"),
        nullable=False,
        index=True,
    )

    service_id = Column(
        Integer,
        ForeignKey("doctor_services.id"),
        nullable=False,
    )

    scheduled_at = Column(
        DateTime,
        nullable=True,
    )

    ends_at = Column(
        DateTime,
        nullable=True,
    )

    access_started_at = Column(
        DateTime,
        nullable=True,
    )

    access_expires_at = Column(
        DateTime,
        nullable=True,
    )

    status = Column(
        String(20),
        default="PENDING",
        nullable=False,
    )

    is_ai_free_chat = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    meeting_link = Column(
        String(1000),
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=ist_now,
        nullable=False,
    )

    patient = relationship(
        "User",
    )

    doctor = relationship(
        "DoctorProfile",
    )

    service = relationship(
        "DoctorService",
    )


# =========================================================
# PAYMENT
# =========================================================

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True)

    consultation_id = Column(
        Integer,
        ForeignKey("consultations.id"),
        unique=True,
        nullable=False,
    )

    amount = Column(Numeric(10, 2), nullable=False)

    platform_fee = Column(
        Numeric(10, 2),
        nullable=False,
    )

    doctor_amount = Column(
        Numeric(10, 2),
        nullable=False,
    )

    transaction_id = Column(
        String(100),
        unique=True,
        nullable=True,
    )

    payment_method = Column(
        String(30),
        nullable=True,
    )

    status = Column(
        String(20),
        default="PENDING",
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=ist_now,
        nullable=False,
    )

# =========================================================
# CHAT MESSAGE
# =========================================================

class Message(Base):
    __tablename__ = "messages"

    id = Column(
        Integer,
        primary_key=True,
    )

    consultation_id = Column(
        Integer,
        ForeignKey("consultations.id"),
        nullable=False,
        index=True,
    )

    sender_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    message = Column(
        Text,
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=ist_now,
        nullable=False,
    )


# =========================================================
# MEDICAL DOCUMENT
# =========================================================

class MedicalDocument(Base):
    __tablename__ = "medical_documents"

    id = Column(
        Integer,
        primary_key=True,
    )

    consultation_id = Column(
        Integer,
        ForeignKey("consultations.id"),
        nullable=False,
    )

    uploaded_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    file_name = Column(
        String(255),
        nullable=False,
    )

    # Stores the Supabase Storage object key.
    # Example:
    # consultations/2/uuid_report.pdf
    file_path = Column(
        String(1000),
        nullable=False,
    )

    file_type = Column(
        String(100),
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=ist_now,
        nullable=False,
    )

    consultation = relationship(
        "Consultation",
    )


# =========================================================
# CONSULTATION NOTES
# =========================================================

class ConsultationNote(Base):
    __tablename__ = "consultation_notes"

    id = Column(
        Integer,
        primary_key=True,
    )

    consultation_id = Column(
        Integer,
        ForeignKey("consultations.id"),
        nullable=False,
    )

    doctor_id = Column(
        Integer,
        ForeignKey("doctor_profiles.id"),
        nullable=False,
    )

    notes = Column(
        Text,
        default="",
    )

    recommendations = Column(
        Text,
        default="",
    )

    created_at = Column(
        DateTime,
        default=ist_now,
        nullable=False,
    )


# =========================================================
# APPOINTMENT REQUEST
# =========================================================

class AppointmentRequest(Base):
    __tablename__ = "appointment_requests"

    id = Column(
        Integer,
        primary_key=True,
    )

    patient_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    specialization = Column(
        String(100),
        nullable=False,
    )

    preferred_date = Column(
        Date,
        nullable=False,
    )

    preferred_time = Column(
        Time,
        nullable=False,
    )

    message = Column(
        Text,
        default="",
    )

    status = Column(
        String(20),
        default="PENDING",
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=ist_now,
        nullable=False,
    )


# =========================================================
# NOTIFICATION
# =========================================================

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(
        Integer,
        primary_key=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    title = Column(
        String(255),
        nullable=False,
    )

    message = Column(
        Text,
        nullable=False,
    )

    is_read = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=ist_now,
        nullable=False,
    )


# =========================================================
# PLATFORM SETTINGS
# =========================================================

class PlatformSetting(Base):
    __tablename__ = "platform_settings"

    id = Column(Integer, primary_key=True)

    platform_fee_percent = Column(
        Numeric(10, 2),
        nullable=False,
    )

    platform_fee_cap = Column(
        Numeric(10, 2),
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        default=ist_now,
        onupdate=ist_now,
        nullable=False,
    )

    commission_percentage = Column(
        Numeric(10, 2),
        default=10,
        nullable=False,
    )

    commission_cap = Column(
        Numeric(10, 2),
        default=100,
        nullable=False,
    )