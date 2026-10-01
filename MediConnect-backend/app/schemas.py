from datetime import date, time, datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


# =========================================================
# AUTH
# =========================================================

class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    is_active: bool


class UserProfileUpdateIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr


class PasswordChangeIn(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6)


# =========================================================
# DOCTOR PROFILE
# =========================================================

class DoctorProfileIn(BaseModel):
    specialization: str = Field(min_length=2, max_length=100)
    qualification: str = Field(min_length=2, max_length=255)
    experience: int = Field(default=0, ge=0)
    bio: str = ""
    consultation_fee: float = Field(default=0, ge=0)


# =========================================================
# DOCTOR SERVICES
# =========================================================

class ServiceIn(BaseModel):
    service_type: str = Field(min_length=2, max_length=40)
    title: str = Field(min_length=2, max_length=150)
    description: str = ""

    price: float = Field(default=0, ge=0)

    duration_value: int = Field(default=30, ge=1)
    duration_unit: str = "MINUTES"

    # Kept for compatibility with older frontend requests.
    # Backend will calculate this from duration_value/unit.
    duration_minutes: int | None = None

    chat_enabled: bool = True
    voice_enabled: bool = False
    video_enabled: bool = False
    document_enabled: bool = False

    @field_validator("duration_unit")
    @classmethod
    def validate_duration_unit(cls, value):
        value = value.upper().strip()

        allowed = {
            "MINUTES",
            "HOURS",
            "DAYS",
        }

        if value not in allowed:
            raise ValueError(
                "duration_unit must be MINUTES, HOURS, or DAYS"
            )

        return value


# =========================================================
# DOCTOR AVAILABILITY
# =========================================================

class AvailabilityIn(BaseModel):
    available_date: date
    start_time: time
    end_time: time

    @field_validator("end_time")
    @classmethod
    def validate_time_range(cls, value, info):
        start_time = info.data.get("start_time")

        if start_time and value <= start_time:
            raise ValueError(
                "end_time must be later than start_time"
            )

        return value


class AvailabilityStatusIn(BaseModel):
    is_available: bool


# =========================================================
# CONSULTATIONS / CALENDAR
# =========================================================

class ConsultationIn(BaseModel):
    doctor_id: int
    service_id: int
    scheduled_at: datetime | None = None


class AIFreeChatIn(BaseModel):
    doctor_id: int
    service_id: int


class ConsultationStatusIn(BaseModel):
    status: str


# =========================================================
# PAYMENT
# =========================================================

class PaymentIn(BaseModel):
    payment_method: str = "TEST"
    simulate_success: bool = True

    # Used when a patient upgrades an existing
    # AI free-chat consultation to a paid service.
    upgrade_service_id: int | None = None


# =========================================================
# CHAT
# =========================================================

class MessageIn(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=5000,
    )


# =========================================================
# CONSULTATION NOTES
# =========================================================

class NoteIn(BaseModel):
    notes: str = ""
    recommendations: str = ""


# =========================================================
# APPOINTMENT REQUESTS
# =========================================================

class AppointmentIn(BaseModel):
    specialization: str = Field(
        min_length=2,
        max_length=100,
    )

    preferred_date: date
    preferred_time: time

    message: str = ""


# =========================================================
# AI HEALTH ASSISTANT
# =========================================================

class HealthIn(BaseModel):
    message: str = Field(
        min_length=2,
        max_length=5000,
    )


# =========================================================
# MEETING
# =========================================================

class MeetingIn(BaseModel):
    meeting_link: str = Field(
        min_length=1,
        max_length=1000,
    )