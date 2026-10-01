import uuid
from datetime import datetime, timedelta, timezone

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
)
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    User,
    Consultation,
    DoctorProfile,
    DoctorService,
    DoctorAvailability,
    Payment,
    Message,
    Notification,
    ConsultationNote,
)
from ..schemas import (
    ConsultationIn,
    AIFreeChatIn,
    PaymentIn,
    MessageIn,
    NoteIn,
    MeetingIn,
)
from ..dependencies import get_current_user, require_role
from ..auth import decode_access_token


router = APIRouter(
    prefix="/consultations",
    tags=["Consultations"],
)


# =========================================================
# WEBSOCKET CONNECTION MANAGER
# =========================================================

class ConsultationConnectionManager:

    def __init__(self):
        self.connections = {}

    async def connect(
        self,
        consultation_id: int,
        websocket: WebSocket,
    ):
        await websocket.accept()

        if consultation_id not in self.connections:
            self.connections[consultation_id] = []

        self.connections[consultation_id].append(websocket)

    def disconnect(
        self,
        consultation_id: int,
        websocket: WebSocket,
    ):
        connections = self.connections.get(
            consultation_id,
            [],
        )

        if websocket in connections:
            connections.remove(websocket)

        if not connections:
            self.connections.pop(
                consultation_id,
                None,
            )

    async def broadcast(
        self,
        consultation_id: int,
        message: dict,
    ):
        connections = list(
            self.connections.get(
                consultation_id,
                [],
            )
        )

        disconnected = []

        for websocket in connections:
            try:
                await websocket.send_json(message)

            except Exception:
                disconnected.append(websocket)

        for websocket in disconnected:
            self.disconnect(
                consultation_id,
                websocket,
            )


manager = ConsultationConnectionManager()


# =========================================================
# HELPERS
# =========================================================

def doctor_profile(
    user,
    db: Session,
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

    return doctor


def get_consultation(
    consultation_id: int,
    db: Session,
):
    consultation = (
        db.query(Consultation)
        .filter(
            Consultation.id == consultation_id
        )
        .first()
    )

    if not consultation:
        raise HTTPException(
            status_code=404,
            detail="Consultation not found",
        )

    return consultation


def can_access(
    consultation,
    user,
    db: Session,
):
    if user.role == "PATIENT":

        if consultation.patient_id == user.id:
            return consultation

    elif user.role == "DOCTOR":

        doctor = doctor_profile(
            user,
            db,
        )

        if consultation.doctor_id == doctor.id:
            return consultation

    raise HTTPException(
        status_code=403,
        detail=(
            "You are not authorized to access "
            "this consultation"
        ),
    )


# =========================================================
# CONSULTATION PAYLOAD
# =========================================================

def consultation_payload(c):

    service = c.service

    # -----------------------------------------------------
    # AI FREE CHAT
    # -----------------------------------------------------

    if c.is_ai_free_chat:

        return {
            "id": c.id,
            "patient_id": c.patient_id,
            "doctor_id": c.doctor_id,
            "service_id": c.service_id,

            "service_title": "AI Free Chat",
            "service_type": "AI_FREE_CHAT",
            "price": 0,

            "duration_value": 10,
            "duration_unit": "MESSAGES",
            "duration_minutes": None,

            "chat_enabled": True,
            "voice_enabled": False,
            "video_enabled": False,
            "document_enabled": False,

            "scheduled_at": c.scheduled_at,
            "ends_at": c.ends_at,

            "access_started_at": c.access_started_at,
            "access_expires_at": c.access_expires_at,

            "status": c.status,
            "meeting_link": None,
            "created_at": c.created_at,

            "is_ai_free_chat": True,
        }

    # -----------------------------------------------------
    # NORMAL CONSULTATION
    # -----------------------------------------------------

    return {
        "id": c.id,
        "patient_id": c.patient_id,
        "doctor_id": c.doctor_id,
        "service_id": c.service_id,

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

        "price": (
            float(service.price or 0)
            if service
            else 0
        ),

        "duration_value": (
            service.duration_value
            if service
            else None
        ),

        "duration_unit": (
            service.duration_unit
            if service
            else None
        ),

        "duration_minutes": (
            service.duration_minutes
            if service
            else None
        ),

        "chat_enabled": (
            service.chat_enabled
            if service
            else False
        ),

        "voice_enabled": (
            service.voice_enabled
            if service
            else False
        ),

        "video_enabled": (
            service.video_enabled
            if service
            else False
        ),

        "document_enabled": (
            service.document_enabled
            if service
            else False
        ),

        "scheduled_at": c.scheduled_at,
        "ends_at": c.ends_at,

        "access_started_at": c.access_started_at,
        "access_expires_at": c.access_expires_at,

        "status": c.status,
        "meeting_link": c.meeting_link,
        "created_at": c.created_at,

        "is_ai_free_chat": False,
    }


# =========================================================
# CONSULTATION TIME HELPERS
# =========================================================

def consultation_end(
    start: datetime,
    service: DoctorService,
):
    return start + timedelta(
        minutes=service.duration_minutes
    )


def validate_schedule(
    doctor_id: int,
    service: DoctorService,
    scheduled_at: datetime,
    db: Session,
    exclude_consultation_id: int | None = None,
):
    """
    Validate that the requested consultation:

    1. Has a valid date/time.
    2. Falls inside a doctor's availability window.
    3. Has enough time remaining in that window.
    4. Doesn't overlap another active consultation.
    """

    if scheduled_at is None:

        raise HTTPException(
            status_code=400,
            detail=(
                "A scheduled date and time is required "
                "for this service"
            ),
        )

    end_at = consultation_end(
        scheduled_at,
        service,
    )

    # -----------------------------------------------------
    # CHECK DOCTOR AVAILABILITY
    # -----------------------------------------------------

    availability_rows = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_id == doctor_id,
            DoctorAvailability.available_date
            == scheduled_at.date(),
        )
        .all()
    )

    if not availability_rows:

        raise HTTPException(
            status_code=409,
            detail=(
                "Doctor is not available on "
                "the selected date"
            ),
        )

    inside_availability = False

    for slot in availability_rows:

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
            and end_at <= slot_end
        ):

            inside_availability = True
            break

    if not inside_availability:

        raise HTTPException(
            status_code=409,
            detail=(
                "Selected consultation time is outside "
                "the doctor's availability"
            ),
        )

    # -----------------------------------------------------
    # CHECK OVERLAPPING CONSULTATIONS
    # -----------------------------------------------------

    query = (
        db.query(Consultation)
        .filter(
            Consultation.doctor_id == doctor_id,
            Consultation.status.in_(
                [
                    "PENDING",
                    "CONFIRMED",
                    "ONGOING",
                ]
            ),
            Consultation.scheduled_at.isnot(None),
        )
    )

    if exclude_consultation_id is not None:

        query = query.filter(
            Consultation.id != exclude_consultation_id
        )

    existing_consultations = query.all()

    for existing in existing_consultations:

        existing_start = existing.scheduled_at

        if existing.ends_at:

            existing_end = existing.ends_at

        elif existing.service:

            existing_end = consultation_end(
                existing_start,
                existing.service,
            )

        else:
            continue

        if (
            scheduled_at < existing_end
            and end_at > existing_start
        ):

            raise HTTPException(
                status_code=409,
                detail=(
                    "This consultation time overlaps "
                    "another appointment"
                ),
            )

    return end_at


# =========================================================
# CREATE AI FREE CHAT
# =========================================================

@router.post("/ai-free-chat")
def create_ai_free_chat(
    data: AIFreeChatIn,
    user=Depends(require_role("PATIENT")),
    db: Session = Depends(get_db),
):
    """
    Creates the free AI Health Assistant consultation.

    Rules:

    - Chat only
    - Maximum 10 PATIENT messages
    - Doctor messages do not consume the limit
    - No documents
    - No voice
    - No video
    - No paid upgrade
    - After 10 patient messages, the patient must
      book a separate normal consultation.
    """

    # -----------------------------------------------------
    # VERIFY DOCTOR
    # -----------------------------------------------------

    doctor = (
        db.query(DoctorProfile)
        .filter(
            DoctorProfile.id == data.doctor_id,
            DoctorProfile.verification_status == "VERIFIED",
            DoctorProfile.is_available == True,
        )
        .first()
    )

    if not doctor:

        raise HTTPException(
            status_code=404,
            detail="Doctor is not currently available",
        )

    # -----------------------------------------------------
    # VERIFY SELECTED CHAT SERVICE
    # -----------------------------------------------------

    service = (
        db.query(DoctorService)
        .filter(
            DoctorService.id == data.service_id,
            DoctorService.doctor_id == doctor.id,
            DoctorService.is_active == True,
            DoctorService.chat_enabled == True,
        )
        .first()
    )

    if not service:

        raise HTTPException(
            status_code=404,
            detail=(
                "Chat service is not available "
                "for this doctor"
            ),
        )

    # -----------------------------------------------------
    # PREVENT DUPLICATE ACTIVE AI FREE CHATS
    # -----------------------------------------------------

    existing_free_chat = (
        db.query(Consultation)
        .filter(
            Consultation.patient_id == user.id,
            Consultation.is_ai_free_chat == True,
            Consultation.status.in_(
                [
                    "CONFIRMED",
                    "ONGOING",
                ]
            ),
        )
        .first()
    )

    if existing_free_chat:

        raise HTTPException(
            status_code=409,
            detail=(
                "You already have an active "
                "free AI consultation."
            ),
        )

    # -----------------------------------------------------
    # CREATE AI FREE CONSULTATION
    # -----------------------------------------------------

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    consultation = Consultation(
        patient_id=user.id,
        doctor_id=doctor.id,
        service_id=service.id,
        scheduled_at=now,
        status="CONFIRMED",
        is_ai_free_chat=True,
        access_started_at=now,
        access_expires_at=None,
    )

    db.add(consultation)
    db.flush()

    # -----------------------------------------------------
    # NOTIFY DOCTOR
    # -----------------------------------------------------

    db.add(
        Notification(
            user_id=doctor.user_id,
            title="New free AI consultation",
            message=(
                f"Patient {user.name} started a free "
                f"AI Health Assistant consultation."
            ),
            
        )
    )

    db.commit()
    db.refresh(consultation)

    return consultation_payload(
        consultation
    )


# =========================================================
# CREATE NORMAL CONSULTATION
# =========================================================

@router.post("/")
def create(
    data: ConsultationIn,
    user=Depends(require_role("PATIENT")),
    db: Session = Depends(get_db),
):

    doctor = (
        db.query(DoctorProfile)
        .filter(
            DoctorProfile.id == data.doctor_id,
            DoctorProfile.verification_status == "VERIFIED",
            DoctorProfile.is_available == True,
        )
        .first()
    )

    if not doctor:

        raise HTTPException(
            status_code=400,
            detail="Doctor is not currently available",
        )

    service = (
        db.query(DoctorService)
        .filter(
            DoctorService.id == data.service_id,
            DoctorService.doctor_id == data.doctor_id,
            DoctorService.is_active == True,
        )
        .first()
    )

    if not service:

        raise HTTPException(
            status_code=400,
            detail="Doctor service is not available",
        )

    # -----------------------------------------------------
    # NORMAL CONSULTATION MUST HAVE SCHEDULED TIME
    # -----------------------------------------------------

    if not data.scheduled_at:

        raise HTTPException(
            status_code=400,
            detail="Please select a date and time",
        )

    end_at = validate_schedule(
        doctor_id=doctor.id,
        service=service,
        scheduled_at=data.scheduled_at,
        db=db,
    )

    # -----------------------------------------------------
    # CREATE NEW NORMAL CONSULTATION
    #
    # This is what Booking.jsx uses after the AI
    # free-chat limit is reached.
    # -----------------------------------------------------

    consultation = Consultation(
        patient_id=user.id,
        doctor_id=doctor.id,
        service_id=service.id,
        scheduled_at=data.scheduled_at,
        ends_at=end_at,
        status="PENDING",
        is_ai_free_chat=False,
    )

    # -----------------------------------------------------
    # FREE NORMAL SERVICE
    # -----------------------------------------------------

    if float(service.price or 0) == 0:

        consultation.status = "CONFIRMED"

    db.add(consultation)
    db.flush()

    # -----------------------------------------------------
    # NOTIFY DOCTOR FOR FREE CONSULTATION
    # -----------------------------------------------------

    if consultation.status == "CONFIRMED":

        db.add(
            Notification(
                user_id=doctor.user_id,
                title="New consultation booked",
                message=(
                    f"Patient {user.name} booked "
                    f"your {service.title}."
                ),
                
            )
        )

    db.commit()
    db.refresh(consultation)

    return consultation_payload(
        consultation
    )


# =========================================================
# PAYMENT
# =========================================================

@router.post("/{consultation_id}/payment")
def payment(
    consultation_id: int,
    data: PaymentIn,
    user=Depends(require_role("PATIENT")),
    db: Session = Depends(get_db),
):

    consultation = (
        db.query(Consultation)
        .filter(
            Consultation.id == consultation_id,
            Consultation.patient_id == user.id,
        )
        .first()
    )

    if not consultation:

        raise HTTPException(
            status_code=404,
            detail="Consultation not found",
        )

    if consultation.status == "CANCELLED":

        raise HTTPException(
            status_code=400,
            detail=(
                "Cancelled consultation "
                "cannot be paid for"
            ),
        )

    # -----------------------------------------------------
    # AI FREE CHAT CANNOT BE UPGRADED
    # -----------------------------------------------------

    if consultation.is_ai_free_chat:

        raise HTTPException(
            status_code=400,
            detail=(
                "AI free chat cannot be upgraded. "
                "Please book a new consultation."
            ),
        )

    # -----------------------------------------------------
    # NORMAL CONSULTATION
    # -----------------------------------------------------

    service = consultation.service

    if not service:

        raise HTTPException(
            status_code=404,
            detail="Consultation service not found",
        )

    amount = float(
        service.price or 0
    )

    # -----------------------------------------------------
    # FREE NORMAL CONSULTATION
    # -----------------------------------------------------

    if amount <= 0:

        consultation.status = "CONFIRMED"

        db.commit()

        return {
            "status": "PAID",
            "consultation": consultation_payload(
                consultation
            ),
        }

    # -----------------------------------------------------
    # DEMO PAYMENT
    # -----------------------------------------------------

    if not data.simulate_success:

        raise HTTPException(
            status_code=402,
            detail="Demo payment failed",
        )

    # -----------------------------------------------------
    # PREVENT DUPLICATE SUCCESSFUL PAYMENTS
    # -----------------------------------------------------

    existing_payment = (
        db.query(Payment)
        .filter(
            Payment.consultation_id == consultation.id,
            Payment.status == "PAID",
        )
        .first()
    )

    if existing_payment:

        return {
            "status": "PAID",
            "payment_id": existing_payment.id,
            "transaction_id": (
                existing_payment.transaction_id
            ),
            "consultation": consultation_payload(
                consultation
            ),
        }

    # -----------------------------------------------------
    # RE-CHECK CALENDAR CONFLICT
    # -----------------------------------------------------

    if consultation.scheduled_at:

        end_at = validate_schedule(
            doctor_id=consultation.doctor_id,
            service=service,
            scheduled_at=consultation.scheduled_at,
            db=db,
            exclude_consultation_id=consultation.id,
        )

        consultation.ends_at = end_at

    # -----------------------------------------------------
    # PLATFORM FEE
    # -----------------------------------------------------

    fee = min(
        round(amount * 0.10, 2),
        100.00,
    )

    doctor_amount = round(
        amount - fee,
        2,
    )

    # -----------------------------------------------------
    # STORE PAYMENT
    # -----------------------------------------------------

    payment_record = Payment(
        consultation_id=consultation.id,
        amount=amount,
        platform_fee=fee,
        doctor_amount=doctor_amount,
        transaction_id=(
            "DEMO-"
            + uuid.uuid4().hex[:12].upper()
        ),
        payment_method=data.payment_method,
        status="PAID",
    )

    db.add(payment_record)

    consultation.status = "CONFIRMED"

    # -----------------------------------------------------
    # NOTIFY DOCTOR
    # -----------------------------------------------------

    db.add(
        Notification(
            user_id=consultation.doctor.user_id,
            title="Payment received",
            message=(
                f"Consultation #{consultation.id} "
                f"is confirmed."
            ),
            
        )
    )

    # -----------------------------------------------------
    # NOTIFY ADMINS
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
                title="Payment received",
                message=(
                    f"Payment of ₹{amount:.2f} received "
                    f"for consultation "
                    f"#{consultation.id}."
                ),
                
            )
        )

    db.commit()

    db.refresh(
        consultation
    )

    db.refresh(
        payment_record
    )

    return {
        "status": "PAID",
        "payment_id": payment_record.id,
        "transaction_id": (
            payment_record.transaction_id
        ),
        "consultation": consultation_payload(
            consultation
        ),
    }


# =========================================================
# PATIENT CONSULTATIONS
# =========================================================

@router.get("/my")
def my(
    user=Depends(require_role("PATIENT")),
    db: Session = Depends(get_db),
):

    consultations = (
        db.query(Consultation)
        .filter(
            Consultation.patient_id == user.id
        )
        .order_by(
            Consultation.created_at.desc()
        )
        .all()
    )

    return [
        consultation_payload(c)
        for c in consultations
    ]


# =========================================================
# DOCTOR CONSULTATIONS
# =========================================================

@router.get("/doctor")
def doctor_my(
    user=Depends(require_role("DOCTOR")),
    db: Session = Depends(get_db),
):

    doctor = doctor_profile(
        user,
        db,
    )

    consultations = (
        db.query(Consultation)
        .filter(
            Consultation.doctor_id == doctor.id
        )
        .order_by(
            Consultation.created_at.desc()
        )
        .all()
    )

    return [
        consultation_payload(c)
        for c in consultations
    ]


# =========================================================
# DOCTOR EARNINGS
# =========================================================

@router.get("/doctor/earnings")
def doctor_earnings(
    period: str = "month",
    user=Depends(require_role("DOCTOR")),
    db: Session = Depends(get_db),
):

    doctor = doctor_profile(
        user,
        db,
    )

    period = period.lower()

    if period not in {
        "day",
        "month",
        "all",
    }:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid earnings period. "
                "Use day, month, or all."
            ),
        )

    payment_query = (
        db.query(Payment)
        .join(
            Consultation,
            Payment.consultation_id
            == Consultation.id,
        )
        .filter(
            Consultation.doctor_id == doctor.id,
            Payment.status == "PAID",
        )
    )

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if period == "day":

        start = datetime(
            now.year,
            now.month,
            now.day,
        )

        payment_query = payment_query.filter(
            Payment.created_at >= start
        )

    elif period == "month":

        start = datetime(
            now.year,
            now.month,
            1,
        )

        payment_query = payment_query.filter(
            Payment.created_at >= start
        )

    payments = payment_query.all()

    gross_amount = round(
        sum(
            float(payment.amount or 0)
            for payment in payments
        ),
        2,
    )

    platform_fee = round(
        sum(
            float(payment.platform_fee or 0)
            for payment in payments
        ),
        2,
    )

    doctor_earnings = round(
        sum(
            float(payment.doctor_amount or 0)
            for payment in payments
        ),
        2,
    )

    return {
        "period": period,
        "gross_amount": gross_amount,
        "platform_fee": platform_fee,
        "doctor_earnings": doctor_earnings,
        "paid_consultations": len(payments),
        "platform_fee_rule": (
            "10% per booking, maximum ₹100"
        ),
    }


# =========================================================
# SINGLE CONSULTATION
# =========================================================

@router.get("/{consultation_id}")
def get_one(
    consultation_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    consultation = get_consultation(
        consultation_id,
        db,
    )

    can_access(
        consultation,
        user,
        db,
    )

    return consultation_payload(
        consultation
    )


# =========================================================
# MESSAGES - HISTORY
# =========================================================

@router.get("/{consultation_id}/messages")
def messages(
    consultation_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    consultation = get_consultation(
        consultation_id,
        db,
    )

    can_access(
        consultation,
        user,
        db,
    )

    service = consultation.service

    if consultation.is_ai_free_chat:

        chat_enabled = True

    else:

        chat_enabled = (
            service.chat_enabled
            if service
            else False
        )

    if not chat_enabled:

        raise HTTPException(
            status_code=403,
            detail=(
                "Chat is not included in "
                "this consultation"
            ),
        )

    return (
        db.query(Message)
        .filter(
            Message.consultation_id
            == consultation.id
        )
        .order_by(
            Message.created_at.asc()
        )
        .all()
    )


# =========================================================
# MESSAGES - REST FALLBACK
# =========================================================

@router.post("/{consultation_id}/messages")
def send_message(
    consultation_id: int,
    data: MessageIn,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    consultation = get_consultation(
        consultation_id,
        db,
    )

    can_access(
        consultation,
        user,
        db,
    )

    service = consultation.service

    # -----------------------------------------------------
    # AI FREE CHAT ALWAYS HAS CHAT ENABLED
    # -----------------------------------------------------

    if consultation.is_ai_free_chat:

        chat_enabled = True

    else:

        chat_enabled = (
            service.chat_enabled
            if service
            else False
        )

    if not chat_enabled:

        raise HTTPException(
            status_code=403,
            detail=(
                "Chat is not included in "
                "this consultation"
            ),
        )

    # -----------------------------------------------------
    # AI FREE CHAT LIMIT
    #
    # ONLY PATIENT MESSAGES COUNT.
    # -----------------------------------------------------

    if consultation.is_ai_free_chat and user.role == "PATIENT":

        patient_message_count = (
            db.query(Message)
            .filter(
                Message.consultation_id
                == consultation.id,

                Message.sender_id
                == consultation.patient_id,
            )
            .count()
        )

        if patient_message_count >= 10:

            raise HTTPException(
                status_code=403,
                detail=(
                    "You've used all 10 free messages. "
                    "To continue, please book a "
                    "consultation with this doctor."
                ),
            )

    elif float(service.price or 0) == 0:
        message_count = (
            db.query(Message)
            .filter(
                Message.consultation_id == consultation.id
            )
            .count()
        )
        
        if message_count >= 10:
            raise HTTPException(
                status_code=403,
                detail="Free chat limit reached",
                )   

    # -----------------------------------------------------
    # SAVE MESSAGE
    # -----------------------------------------------------

    message = Message(
        consultation_id=consultation.id,
        sender_id=user.id,
        message=data.message,
    )

    db.add(message)

    if consultation.status == "CONFIRMED":

        consultation.status = "ONGOING"

    # -----------------------------------------------------
    # FIND RECIPIENT
    # -----------------------------------------------------

    if user.role == "PATIENT":

        doctor = (
            db.query(DoctorProfile)
            .filter(
                DoctorProfile.id
                == consultation.doctor_id
            )
            .first()
        )

        recipient_id = (
            doctor.user_id
            if doctor
            else None
        )

    else:

        recipient_id = consultation.patient_id

    # -----------------------------------------------------
    # NOTIFICATION
    # -----------------------------------------------------

    if recipient_id:

        db.add(
            Notification(
                user_id=recipient_id,
                title="New consultation message",
                message=(
                    f"New message in consultation "
                    f"#{consultation.id}."
                ),
                
            )
        )

    db.commit()
    db.refresh(message)

    return message


# =========================================================
# WEBSOCKET REAL-TIME CHAT
# =========================================================

@router.websocket("/{consultation_id}/ws")
async def consultation_websocket(
    websocket: WebSocket,
    consultation_id: int,
    token: str,
    db: Session = Depends(get_db),
):

    current_user = None
    consultation = None

    # -----------------------------------------------------
    # IMPORTANT:
    #
    # Accept the WebSocket FIRST.
    #
    # Authentication/authorization failures are then
    # handled inside the WebSocket instead of becoming
    # HTTP 403 handshake errors.
    # -----------------------------------------------------

    await websocket.accept()

    try:

        # -------------------------------------------------
        # AUTHENTICATE JWT
        # -------------------------------------------------

        try:

            payload = decode_access_token(
                token
            )

            user_id = payload.get(
                "sub"
            )

            if user_id is None:

                await websocket.send_json({
                    "type": "error",
                    "message": (
                        "Invalid authentication token."
                    ),
                })

                await websocket.close(
                    code=1008
                )

                return

            current_user = (
                db.query(User)
                .filter(
                    User.id == int(user_id),
                    User.is_active == True,
                )
                .first()
            )

            if not current_user:

                await websocket.send_json({
                    "type": "error",
                    "message": (
                        "User authentication failed."
                    ),
                })

                await websocket.close(
                    code=1008
                )

                return

        except Exception as error:

            print(
                "WEBSOCKET JWT ERROR:",
                repr(error),
            )

            await websocket.send_json({
                "type": "error",
                "message": "Authentication failed.",
            })

            await websocket.close(
                code=1008
            )

            return

        # -------------------------------------------------
        # LOAD CONSULTATION
        # -------------------------------------------------

        consultation = (
            db.query(Consultation)
            .filter(
                Consultation.id
                == consultation_id
            )
            .first()
        )

        if not consultation:

            await websocket.send_json({
                "type": "error",
                "message": (
                    "Consultation not found."
                ),
            })

            await websocket.close(
                code=1008
            )

            return

        # -------------------------------------------------
        # VERIFY PATIENT / DOCTOR ACCESS
        # -------------------------------------------------

        authorized = False

        if (
            current_user.role == "PATIENT"
            and consultation.patient_id
            == current_user.id
        ):

            authorized = True

        elif current_user.role == "DOCTOR":

            doctor = (
                db.query(DoctorProfile)
                .filter(
                    DoctorProfile.user_id
                    == current_user.id,

                    DoctorProfile.id
                    == consultation.doctor_id,
                )
                .first()
            )

            if doctor:

                authorized = True

        if not authorized:

            await websocket.send_json({
                "type": "error",
                "message": (
                    "You are not authorized to access "
                    "this consultation."
                ),
            })

            await websocket.close(
                code=1008
            )

            return

        # -------------------------------------------------
        # VERIFY CHAT ACCESS
        # -------------------------------------------------

        service = consultation.service

        if consultation.is_ai_free_chat:

            # AI Free Chat always supports chat.
            chat_enabled = True

        else:

            chat_enabled = (
                service.chat_enabled
                if service
                else False
            )

        if not chat_enabled:

            await websocket.send_json({
                "type": "error",
                "message": (
                    "Chat is not included in "
                    "this consultation."
                ),
            })

            await websocket.close(
                code=1008
            )

            return

        # -------------------------------------------------
        # REGISTER CONNECTION
        # -------------------------------------------------

        if consultation_id not in manager.connections:

            manager.connections[
                consultation_id
            ] = []

        manager.connections[
            consultation_id
        ].append(websocket)

        # -------------------------------------------------
        # CONNECTION SUCCESS
        # -------------------------------------------------

        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "consultation_id": consultation_id,
            "is_ai_free_chat": (
                consultation.is_ai_free_chat
            ),
            "message_limit": (
                10
                if consultation.is_ai_free_chat
                else None
            ),
        })

        # -------------------------------------------------
        # LISTEN FOR MESSAGES
        # -------------------------------------------------

        while True:

            data = await websocket.receive_json()

            message_text = str(
                data.get(
                    "message",
                    "",
                )
            ).strip()

            # -------------------------------------------------
            # EMPTY MESSAGE
            # -------------------------------------------------

            if not message_text:

                await websocket.send_json({
                    "type": "error",
                    "message": (
                        "Message cannot be empty."
                    ),
                })

                continue

            # -------------------------------------------------
            # MESSAGE LENGTH
            # -------------------------------------------------

            if len(message_text) > 5000:

                await websocket.send_json({
                    "type": "error",
                    "message": (
                        "Message cannot exceed "
                        "5000 characters."
                    ),
                })

                continue

            # -------------------------------------------------
            # AI FREE CHAT LIMIT
            #
            # ONLY PATIENT MESSAGES COUNT.
            #
            # Doctor messages do NOT consume the
            # patient's 10-message allowance.
            # -------------------------------------------------

            if consultation.is_ai_free_chat and current_user.role == "PATIENT":

                patient_message_count = (
                    db.query(Message)
                    .filter(
                        Message.consultation_id
                        == consultation.id,

                        Message.sender_id
                        == consultation.patient_id,
                    )
                    .count()
                )

                if patient_message_count >= 10:

                    await websocket.send_json({
                        "type": "free_limit_reached",
                        "message": (
                            "You've used all 10 free messages. "
                            "To continue, please book a "
                            "consultation with this doctor."
                        ),
                        "messages_used": 10,
                        "message_limit": 10,
                    })

                    continue

            # -------------------------------------------------
            # SAVE MESSAGE
            # -------------------------------------------------

            message = Message(
                consultation_id=consultation.id,
                sender_id=current_user.id,
                message=message_text,
            )

            db.add(message)

            if consultation.status == "CONFIRMED":

                consultation.status = "ONGOING"

            # -------------------------------------------------
            # FIND RECIPIENT
            # -------------------------------------------------

            if current_user.role == "PATIENT":

                doctor = (
                    db.query(DoctorProfile)
                    .filter(
                        DoctorProfile.id
                        == consultation.doctor_id
                    )
                    .first()
                )

                recipient_id = (
                    doctor.user_id
                    if doctor
                    else None
                )

            else:

                recipient_id = (
                    consultation.patient_id
                )

            # -------------------------------------------------
            # NOTIFICATION
            # -------------------------------------------------

            if recipient_id:

                db.add(
                    Notification(
                        user_id=recipient_id,
                        title="New consultation message",
                        message=(
                            f"New message in consultation "
                            f"#{consultation.id}."
                        ),
                        
                    )
                )

            # -------------------------------------------------
            # COMMIT
            # -------------------------------------------------

            db.commit()
            db.refresh(message)

            # -------------------------------------------------
            # BUILD WEBSOCKET PAYLOAD
            # -------------------------------------------------

            message_payload = {
                "type": "message",
                "id": message.id,
                "consultation_id": (
                    message.consultation_id
                ),
                "sender_id": message.sender_id,
                "message": message.message,
                "created_at": (
                    message.created_at.replace(
                        tzinfo=timezone.utc
                    ).isoformat()
                    if message.created_at
                    else None
                ),
            }

            # -------------------------------------------------
            # SEND TO PATIENT + DOCTOR
            # -------------------------------------------------

            await manager.broadcast(
                consultation_id,
                message_payload,
            )

    except WebSocketDisconnect:

        manager.disconnect(
            consultation_id,
            websocket,
        )

    except Exception as error:

        print(
            "WEBSOCKET ERROR:",
            repr(error),
        )

        manager.disconnect(
            consultation_id,
            websocket,
        )

        try:

            await websocket.send_json({
                "type": "error",
                "message": (
                    "WebSocket server error."
                ),
            })

        except Exception:
            pass

        try:

            await websocket.close(
                code=1011
            )

        except Exception:
            pass


# =========================================================
# DOCUMENT / FEATURE ACCESS CHECK
# =========================================================

@router.get("/{consultation_id}/features")
def features(
    consultation_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    consultation = get_consultation(
        consultation_id,
        db,
    )

    can_access(
        consultation,
        user,
        db,
    )

    # -----------------------------------------------------
    # AI FREE CHAT
    # -----------------------------------------------------

    if consultation.is_ai_free_chat:

        return {
            "chat_enabled": True,
            "voice_enabled": False,
            "video_enabled": False,
            "document_enabled": False,
            "is_ai_free_chat": True,
            "message_limit": 10,
        }

    # -----------------------------------------------------
    # NORMAL CONSULTATION
    # -----------------------------------------------------

    service = consultation.service

    return {
        "chat_enabled": (
            service.chat_enabled
            if service
            else False
        ),

        "voice_enabled": (
            service.voice_enabled
            if service
            else False
        ),

        "video_enabled": (
            service.video_enabled
            if service
            else False
        ),

        "document_enabled": (
            service.document_enabled
            if service
            else False
        ),

        "is_ai_free_chat": False,
        "message_limit": None,
    }


# =========================================================
# DOCTOR NOTES
# =========================================================

@router.post("/{consultation_id}/notes")
def add_note(
    consultation_id: int,
    data: NoteIn,
    user=Depends(require_role("DOCTOR")),
    db: Session = Depends(get_db),
):

    doctor = doctor_profile(
        user,
        db,
    )

    consultation = (
        db.query(Consultation)
        .filter(
            Consultation.id == consultation_id,
            Consultation.doctor_id == doctor.id,
        )
        .first()
    )

    if not consultation:

        raise HTTPException(
            status_code=404,
            detail="Consultation not found",
        )

    note = ConsultationNote(
        consultation_id=consultation.id,
        doctor_id=doctor.id,
        **data.model_dump(),
    )

    db.add(note)
    db.commit()
    db.refresh(note)

    return note


@router.get("/{consultation_id}/notes")
def notes(
    consultation_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    consultation = get_consultation(
        consultation_id,
        db,
    )

    can_access(
        consultation,
        user,
        db,
    )

    return (
        db.query(ConsultationNote)
        .filter(
            ConsultationNote.consultation_id
            == consultation.id
        )
        .order_by(
            ConsultationNote.created_at.desc()
        )
        .all()
    )


# =========================================================
# MEETING LINK
# =========================================================

@router.put("/{consultation_id}/meeting")
def meeting(
    consultation_id: int,
    data: MeetingIn,
    user=Depends(require_role("DOCTOR")),
    db: Session = Depends(get_db),
):

    doctor = doctor_profile(
        user,
        db,
    )

    consultation = (
        db.query(Consultation)
        .filter(
            Consultation.id == consultation_id,
            Consultation.doctor_id == doctor.id,
        )
        .first()
    )

    if not consultation:

        raise HTTPException(
            status_code=404,
            detail="Consultation not found",
        )

    # -----------------------------------------------------
    # AI FREE CHAT DOES NOT SUPPORT CALLS
    # -----------------------------------------------------

    if consultation.is_ai_free_chat:

        raise HTTPException(
            status_code=400,
            detail=(
                "AI free chat does not include "
                "live calls"
            ),
        )

    service = consultation.service

    if not service:

        raise HTTPException(
            status_code=400,
            detail="Consultation service not found",
        )

    if (
        not service.video_enabled
        and not service.voice_enabled
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "This service does not include "
                "a live call"
            ),
        )

    consultation.meeting_link = (
        data.meeting_link
    )

    db.add(
        Notification(
            user_id=consultation.patient_id,
            title="Consultation call is ready",
            message=(
                f"Your call link for consultation "
                f"#{consultation.id} is ready."
            ),
            
        )
    )

    db.commit()

    return consultation_payload(
        consultation
    )


# =========================================================
# CONSULTATION STATUS
# =========================================================

@router.put("/{consultation_id}/status")
def set_status(
    consultation_id: int,
    status: str,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    consultation = get_consultation(
        consultation_id,
        db,
    )

    can_access(
        consultation,
        user,
        db,
    )

    allowed = {
        "CONFIRMED",
        "ONGOING",
        "COMPLETED",
        "CANCELLED",
    }

    status = status.upper()

    if status not in allowed:

        raise HTTPException(
            status_code=400,
            detail="Invalid consultation status",
        )

    # -----------------------------------------------------
    # DO NOT REOPEN CLOSED CONSULTATIONS
    # -----------------------------------------------------

    if (
        consultation.status
        in {
            "COMPLETED",
            "CANCELLED",
        }
        and status
        in {
            "CONFIRMED",
            "ONGOING",
        }
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "This consultation is already closed"
            ),
        )

    consultation.status = status

    db.commit()

    return consultation_payload(
        consultation
    )