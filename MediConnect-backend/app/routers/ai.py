import json
import os
import re

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from groq import Groq

from ..database import get_db
from ..models import DoctorProfile, DoctorService, User
from ..schemas import HealthIn
from ..dependencies import get_current_user


router = APIRouter(
    prefix="/ai",
    tags=["AI Health Navigation"],
)


# ============================================================
# GROQ CONFIGURATION
# ============================================================

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "openai/gpt-oss-20b",
)


# ============================================================
# ALLOWED VALUES
# ============================================================

SPECIALTIES = [
    "Dermatology",
    "ENT",
    "Ophthalmology",
    "Cardiology",
    "Urology",
    "Neurology",
    "Orthopedics",
    "Psychiatry",
    "Pediatrics",
    "Gynecology",
    "Sexology",
    "Gastroenterology",
    "Pulmonology",
    "General Physician",
]


URGENCY_LEVELS = [
    "NORMAL",
    "URGENT",
    "EMERGENCY",
]


# ============================================================
# RULE-BASED FALLBACK / STRONG SPECIALTY MATCHING
# ============================================================

RULES = {

    # --------------------------------------------------------
    # DERMATOLOGY
    # --------------------------------------------------------

    "Dermatology": [
        "skin",
        "rash",
        "itch",
        "itching",
        "acne",
        "pimple",
        "pimples",
        "eczema",
        "redness",
        "dermat",
        "dane",
        "daane",
        "khujli",
        "kharish",
        "skin problem",
        "skin issue",
        "hair fall",
        "hair loss",
        "hair problem",
        "nail problem",
        "baal jhad",
        "baal gir",
    ],


    # --------------------------------------------------------
    # ENT
    # --------------------------------------------------------

    "ENT": [
        "ear",
        "ears",
        "hearing",
        "throat",
        "tonsil",
        "tonsils",
        "sinus",
        "nose",
        "kaan",
        "gala",
        "naak",
        "sore throat",
        "ear pain",
        "nose bleed",
        "nosebleed",
        "hearing problem",
    ],


    # --------------------------------------------------------
    # OPHTHALMOLOGY
    # --------------------------------------------------------

    "Ophthalmology": [
        "eye",
        "eyes",
        "vision",
        "blur",
        "blurry",
        "blurred",
        "glasses",
        "eyesight",
        "aankh",
        "aankhon",
        "dhundhla",
        "dhundhli",
        "nazar",
        "eye pain",
        "red eye",
        "red eyes",
        "vision problem",
        "sight problem",
    ],


    # --------------------------------------------------------
    # CARDIOLOGY
    # --------------------------------------------------------

    "Cardiology": [
        "chest pain",
        "chest",
        "heart",
        "palpitation",
        "palpitations",
        "blood pressure",
        "bp",
        "heartbeat",
        "heart beat",
        "seene",
        "seena",
        "dil",
        "racing heart",
        "fast heartbeat",
        "heart problem",
    ],


    # --------------------------------------------------------
    # UROLOGY
    # --------------------------------------------------------

    "Urology": [
        "urinary",
        "urinery",
        "urinery tract",
        "urinary tract",
        "urinary truct",
        "urinary track",
        "urinery track",
        "urinery truct",
        "urine",
        "urin",
        "urination",
        "peshab",
        "peshaab",
        "pee",
        "bladder",
        "kidney",
        "kidny",
        "kidneys",
        "kidny pain",
        "kidney pain",
        "kidney problem",
        "kidney stone",
        "kidney stones",
        "urine problem",
        "urine issue",
        "urine infection",
        "uti",
        "burning urine",
        "burning while urinating",
        "pain while urinating",
        "pain during urination",
        "frequent urination",
        "frequent urine",
        "blood in urine",
        "urine me blood",
        "peshab me blood",
        "peshab mein blood",
        "difficulty urinating",
        "difficulty passing urine",
        "peshab karne me dikkat",
        "peshab karne mein dikkat",
        "peshab karne me problem",
        "peshab karne mein problem",
        "private part",
        "private parts",
    ],


    # --------------------------------------------------------
    # NEUROLOGY
    # --------------------------------------------------------

    "Neurology": [
        "neurology",
        "neurological",
        "migraine",
        "severe migraine",
        "seizure",
        "seizures",
        "fits",
        "fit",
        "convulsion",
        "convulsions",
        "nerve",
        "nerves",
        "nerve problem",
        "numbness",
        "tingling",
        "balance problem",
        "balance issue",
        "loss of balance",
        "dizziness",
        "chakkar",
        "brain",
        "brain problem",
        "memory problem",
        "memory loss",
        "frequent headache",
        "recurring headache",
    ],


    # --------------------------------------------------------
    # ORTHOPEDICS
    # --------------------------------------------------------

    "Orthopedics": [
        "orthopedic",
        "orthopaedic",
        "bone",
        "bones",
        "bone pain",
        "joint",
        "joints",
        "joint pain",
        "muscle pain",
        "muscles",
        "fracture",
        "fractured",
        "back pain",
        "backache",
        "knee",
        "knees",
        "knee pain",
        "shoulder",
        "shoulder pain",
        "elbow",
        "wrist",
        "ankle",
        "neck pain",
        "hip pain",
        "ghutna",
        "ghutne",
        "kamar",
        "kamar dard",
        "haath fracture",
        "pair me dard",
        "leg pain",
        "arm pain",
    ],


    # --------------------------------------------------------
    # PSYCHIATRY
    # --------------------------------------------------------

    "Psychiatry": [
        "psychiatry",
        "psychiatric",
        "anxiety",
        "anxious",
        "panic attack",
        "panic attacks",
        "depression",
        "depressed",
        "negative thoughts",
        "suicidal thoughts",
        "suicide thoughts",
        "self harm",
        "self-harm",
        "mental health",
        "mental problem",
        "mental stress",
        "stress",
        "severe stress",
        "mood problem",
        "mood swings",
        "sleep problem",
        "sleep problems",
        "insomnia",
        "cannot sleep",
        "can't sleep",
        "neend nahi",
        "neend nhi",
        "bahut stress",
        "negative thought",
    ],


    # --------------------------------------------------------
    # PEDIATRICS
    # --------------------------------------------------------

    "Pediatrics": [
        "child",
        "children",
        "kid",
        "kids",
        "baby",
        "babies",
        "infant",
        "infants",
        "my son",
        "my daughter",
        "my child",
        "mera beta",
        "meri beti",
        "mere bacche",
        "mere bache",
        "bacche ko",
        "bache ko",
        "child ko",
        "baby ko",
    ],


    # --------------------------------------------------------
    # GYNECOLOGY
    # --------------------------------------------------------

    "Gynecology": [
        "gynecology",
        "gynaecology",
        "gynecologist",
        "gynaecologist",
        "period",
        "periods",
        "menstrual",
        "menstruation",
        "period pain",
        "period problem",
        "irregular periods",
        "heavy periods",
        "bleeding between periods",
        "vaginal bleeding",
        "vaginal discharge",
        "white discharge",
        "pregnancy",
        "pregnant",
        "ovary",
        "ovaries",
        "ovarian",
        "uterus",
        "uterine",
        "pcos",
        "pcod",
        "endometriosis",
        "pelvic pain",
        "female reproductive",
        "women's health",
        "womens health",
        "mahavari",
        "period nahi aa raha",
        "period late",
        "periods late",
        "period me pain",
        "period mein pain",
    ],


    # --------------------------------------------------------
    # SEXOLOGY
    # --------------------------------------------------------

    "Sexology": [
        "sexology",
        "sexologist",
        "sexual health",
        "sexual problem",
        "sex problem",
        "sexual issue",
        "sex issue",
        "erectile dysfunction",
        "erection problem",
        "erectile problem",
        "premature ejaculation",
        "ejaculation problem",
        "low libido",
        "low sex drive",
        "sexual dysfunction",
        "pain during sex",
        "pain during intercourse",
        "intercourse problem",
        "sexual performance",
        "sex drive",
        "libido",
    ],


    # --------------------------------------------------------
    # GASTROENTEROLOGY
    # --------------------------------------------------------

    "Gastroenterology": [
        "gastroenterology",
        "gastroenterologist",
        "stomach",
        "stomach pain",
        "stomach problem",
        "abdominal pain",
        "abdomen",
        "digestion",
        "digestive",
        "digestive problem",
        "indigestion",
        "acidity",
        "acid reflux",
        "heartburn",
        "gas",
        "bloating",
        "constipation",
        "diarrhea",
        "diarrhoea",
        "loose motion",
        "loose motions",
        "vomiting",
        "nausea",
        "liver",
        "liver problem",
        "gallbladder",
        "pancreas",
        "intestinal",
        "intestine",
        "ibs",
        "crohn",
        "ulcerative colitis",
    ],


    # --------------------------------------------------------
    # PULMONOLOGY
    # --------------------------------------------------------

    "Pulmonology": [
        "pulmonology",
        "pulmonologist",
        "lung",
        "lungs",
        "lung problem",
        "lung pain",
        "breathing problem",
        "breathing difficulty",
        "breathing issue",
        "difficulty breathing",
        "shortness of breath",
        "breathlessness",
        "asthma",
        "wheezing",
        "wheeze",
        "persistent cough",
        "chronic cough",
        "coughing",
        "lung infection",
        "respiratory",
        "respiratory problem",
        "chest congestion",
    ],


    # --------------------------------------------------------
    # GENERAL PHYSICIAN
    # --------------------------------------------------------

    "General Physician": [],
}


def specialty_from_rules(text: str) -> str:

    text = text.lower().strip()

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    specialty_priority = [
        "Urology",
        "Gynecology",
        "Sexology",
        "Gastroenterology",
        "Pulmonology",
        "Neurology",
        "Orthopedics",
        "Psychiatry",
        "Pediatrics",
        "Ophthalmology",
        "ENT",
        "Cardiology",
        "Dermatology",
    ]

    for specialty in specialty_priority:

        keywords = RULES.get(
            specialty,
            [],
        )

        for keyword in keywords:

            if keyword in text:
                return specialty

    return "General Physician"


# ============================================================
# SAFETY RULES
# ============================================================

EMERGENCY_PATTERNS = [
    r"\bsevere chest pain\b",
    r"\bcrushing chest pain\b",
    r"\bchest pain.*difficulty breathing\b",
    r"\bdifficulty breathing.*chest pain\b",
    r"\bcan't breathe\b",
    r"\bcannot breathe\b",
    r"\bunable to breathe\b",
    r"\bsevere breathing problem\b",
    r"\bshortness of breath\b.*\bfaint\b",
    r"\bfaint.*\bchest pain\b",
    r"\bunconscious\b",
    r"\bpassed out\b",
    r"\bseizure\b",
    r"\bheavy bleeding\b",
    r"\buncontrolled bleeding\b",
    r"\bsuicidal\b",
    r"\bsuicide\b",
    r"\bkill myself\b",
    r"\bself harm\b",
    r"\bself-harm\b",
]


URGENT_PATTERNS = [
    r"\bhigh fever\b",
    r"\bvery high fever\b",
    r"\bsevere pain\b",
    r"\bsevere headache\b",
    r"\bcontinuous vomiting\b",
    r"\bvomiting blood\b",
    r"\bblood in vomit\b",
    r"\bblood in stool\b",
    r"\bsevere abdominal pain\b",
    r"\bserious allergic reaction\b",
    r"\bface swelling\b",
    r"\bthroat swelling\b",
    r"\bcan't swallow\b",
    r"\bcannot swallow\b",
]


def safety_override(
    text: str,
    specialty: str,
):

    text_lower = text.lower()

    for pattern in EMERGENCY_PATTERNS:

        if re.search(
            pattern,
            text_lower,
        ):

            return {
                "urgency": "EMERGENCY",
                "message": (
                    "Your description may include warning "
                    "signs that require immediate medical "
                    "attention. Please seek emergency "
                    "medical care now."
                ),
            }

    for pattern in URGENT_PATTERNS:

        if re.search(
            pattern,
            text_lower,
        ):

            return {
                "urgency": "URGENT",
                "message": (
                    "Your description may require prompt "
                    "medical attention. Consider contacting "
                    "a qualified healthcare professional soon."
                ),
            }

    return {
        "urgency": "NORMAL",
        "message": (
            f"A {specialty} consultation may be "
            "appropriate based on your description."
        ),
    }


# ============================================================
# GROQ AI
# ============================================================

def get_groq_assessment(
    text: str,
):

    if not GROQ_API_KEY:
        return None

    try:

        client = Groq(
            api_key=GROQ_API_KEY
        )

        system_prompt = """
You are the AI health navigation assistant for MediConnect.

Your job is healthcare navigation, NOT medical diagnosis.

Analyze the user's description and suggest:

1. The most relevant medical specialty.
2. A general urgency level.
3. A short, safe navigation message.

ALLOWED SPECIALTIES:

Dermatology
ENT
Ophthalmology
Cardiology
Urology
Neurology
Orthopedics
Psychiatry
Pediatrics
Gynecology
Sexology
Gastroenterology
Pulmonology
General Physician

SPECIALTY GUIDANCE:

Dermatology:
skin, acne, pimples, rash, itching, eczema, hair or nail problems.

ENT:
ear, nose, throat, sinus and hearing problems.

Ophthalmology:
eye, eyesight, vision, blurred vision, eye redness or eye pain.

Cardiology:
heart, chest pain, palpitations, heartbeat and cardiovascular concerns.

Urology:
urine, urinary tract, bladder, kidney, urination, burning while urinating,
blood in urine, frequent urination, difficulty urinating or urinary private-part
concerns.

Neurology:
brain, nerves, recurring migraine, seizures/fits, numbness, balance problems
and neurological symptoms.

Orthopedics:
bones, joints, muscles, fractures, back, knee, shoulder, neck or limb pain.

Psychiatry:
anxiety, depression, severe stress, mood concerns, panic attacks,
negative thoughts and mental-health concerns.

Pediatrics:
symptoms involving babies, children or minors.

Gynecology:
women's reproductive health, menstrual/period problems, pelvic pain,
ovaries, uterus, vaginal bleeding or discharge and related concerns.

Sexology:
sexual-health concerns, sexual dysfunction, erectile or ejaculation problems,
libido concerns and sexual-performance concerns.

Gastroenterology:
stomach, digestive system, acidity, reflux, constipation, diarrhea,
abdominal problems, liver, gallbladder, pancreas and intestinal concerns.

Pulmonology:
lungs, breathing problems, asthma, wheezing, persistent cough,
shortness of breath and respiratory concerns.

General Physician:
general illness, fever, common symptoms, weakness, unclear symptoms,
or symptoms that do not clearly belong to a more specific specialty.

IMPORTANT:

Choose the MOST RELEVANT available specialty based on the user's
described body system and symptoms.

Do NOT default to General Physician when a more specific specialty
clearly matches.

The user may communicate in:

- English
- Hindi
- Hinglish
- Hindi written using English letters
- Informal chat language
- Misspelled words
- Mixed Hindi and English

Understand meaning even when spelling is imperfect.

Examples:

"mere haath pe daane aur khujli hai"
-> Dermatology

"kaan me dard hai"
-> ENT

"meri aankh dhundhli ho rahi hai"
-> Ophthalmology

"seene me dard ho raha hai"
-> Cardiology

"peshab karte time jalan hoti hai"
-> Urology

"mere kidney me dard hai"
-> Urology

"mujhe migraine baar baar hota hai"
-> Neurology

"mujhe fits aate hain"
-> Neurology

"mere ghutne me dard hai"
-> Orthopedics

"meri kamar me dard hai"
-> Orthopedics

"mujhe anxiety aur negative thoughts aate hain"
-> Psychiatry

"mere 5 saal ke bacche ko bukhar hai"
-> Pediatrics

"mujhe periods bahut irregular hain"
-> Gynecology

"mujhe sexual health problem hai"
-> Sexology

"mujhe acidity aur digestion problem hai"
-> Gastroenterology

"mujhe asthma aur wheezing hoti hai"
-> Pulmonology

"mujhe body me ajeeb sa lag raha hai"
-> General Physician

Do NOT diagnose a disease.

Do NOT prescribe medicines.

Do NOT recommend medicine names or dosages.

Do NOT claim certainty.

Do NOT tell the user that they definitely have a condition.

Do NOT say that a specific treatment is definitely required.

Use neutral healthcare-navigation language.

For example:

"A qualified specialist can assess your symptoms and guide you
on the appropriate next steps."

"A qualified healthcare professional can assess your symptoms
and guide you further."

For potentially serious symptoms, use URGENT or EMERGENCY.

For obvious emergency symptoms such as:

- severe chest pain
- severe difficulty breathing
- unconsciousness
- seizure
- uncontrolled heavy bleeding
- suicidal thoughts
- immediate danger

use EMERGENCY.

Return ONLY a valid JSON object.

The JSON must contain:

{
  "specialty": "Urology",
  "urgency": "NORMAL",
  "message": "Short and safe healthcare navigation guidance."
}

The specialty MUST be exactly one of:

Dermatology
ENT
Ophthalmology
Cardiology
Urology
Neurology
Orthopedics
Psychiatry
Pediatrics
Gynecology
Sexology
Gastroenterology
Pulmonology
General Physician

The urgency MUST be exactly one of:

NORMAL
URGENT
EMERGENCY

The message should:

- be one or two short sentences
- be neutral
- avoid diagnosis
- avoid medication advice
- avoid treatment claims
- focus on the next appropriate healthcare step

Never include markdown.
Never include additional JSON fields.
"""

        response = client.chat.completions.create(
            model=GROQ_MODEL,

            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": text,
                },
            ],

            temperature=0.1,

            max_tokens=250,

            response_format={
                "type": "json_object"
            },
        )

        if not response.choices:
            return None

        raw_content = (
            response
            .choices[0]
            .message
            .content
        )

        if not raw_content:
            return None

        raw_response = raw_content.strip()

        # ----------------------------------------------------
        # REMOVE ACCIDENTAL MARKDOWN FENCES
        # ----------------------------------------------------

        raw_response = re.sub(
            r"^```json\s*",
            "",
            raw_response,
            flags=re.IGNORECASE,
        )

        raw_response = re.sub(
            r"^```\s*",
            "",
            raw_response,
        )

        raw_response = re.sub(
            r"\s*```$",
            "",
            raw_response,
        )

        raw_response = raw_response.strip()

        if not raw_response:
            return None

        # ----------------------------------------------------
        # PARSE JSON
        # ----------------------------------------------------

        try:

            result = json.loads(
                raw_response
            )

        except json.JSONDecodeError:

            return None

        # ----------------------------------------------------
        # VALIDATE JSON OBJECT
        # ----------------------------------------------------

        if not isinstance(
            result,
            dict,
        ):
            return None

        # ----------------------------------------------------
        # READ VALUES
        # ----------------------------------------------------

        specialty = result.get(
            "specialty"
        )

        urgency = result.get(
            "urgency"
        )

        message = result.get(
            "message"
        )

        # ----------------------------------------------------
        # VALIDATE SPECIALTY
        # ----------------------------------------------------

        if specialty not in SPECIALTIES:
            return None

        # ----------------------------------------------------
        # VALIDATE URGENCY
        # ----------------------------------------------------

        if urgency not in URGENCY_LEVELS:
            return None

        # ----------------------------------------------------
        # VALIDATE MESSAGE
        # ----------------------------------------------------

        if not isinstance(
            message,
            str,
        ):
            return None

        message = message.strip()

        if not message:
            return None

        # ----------------------------------------------------
        # FINAL CLEAN RESULT
        # ----------------------------------------------------

        return {
            "specialty": specialty,
            "urgency": urgency,
            "message": message,
        }

    except Exception:

        return None


# ============================================================
# AVAILABLE DOCTORS
# ============================================================

def get_available_doctors(
    specialty: str,
    db: Session,
):

    query = (
        db.query(DoctorProfile)
        .join(User)
        .filter(
            DoctorProfile.specialization.ilike(
                f"%{specialty}%"
            ),
            DoctorProfile.verification_status
            == "VERIFIED",
            DoctorProfile.is_available
            == True,
            User.is_active
            == True,
        )
    )

    doctors = []

    for doctor in query.all():

        # ----------------------------------------------------
        # FIND AN ACTIVE CHAT-ENABLED SERVICE
        # ----------------------------------------------------

        chat_service = (
            db.query(DoctorService)
            .filter(
                DoctorService.doctor_id
                == doctor.id,

                DoctorService.is_active
                == True,

                DoctorService.chat_enabled
                == True,
            )
            .order_by(
                DoctorService.id.asc()
            )
            .first()
        )

        if not chat_service:
            continue

        doctors.append(
            {
                "id": doctor.id,

                "name": doctor.user.name,

                "specialization":
                    doctor.specialization,

                "qualification":
                    doctor.qualification,

                "experience":
                    doctor.experience,

                "bio":
                    doctor.bio,

                "consultation_fee":
                    float(
                        doctor.consultation_fee
                        or 0
                    ),

                "verification_status":
                    doctor.verification_status,

                "is_available":
                    doctor.is_available,

                "free_chat_service_id":
                    chat_service.id,
            }
        )

    return doctors


# ============================================================
# HEALTH ASSESSMENT ENDPOINT
# ============================================================

@router.post(
    "/health-assessment"
)
def assess(
    data: HealthIn,

    user=Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):

    text = (
        data.message
        or ""
    ).strip()

    # --------------------------------------------------------
    # EMPTY INPUT
    # --------------------------------------------------------

    if not text:

        return {
            "specialization":
                "General Physician",

            "specialty":
                "General Physician",

            "urgency":
                "NORMAL",

            "message":
                "Please describe what you are experiencing.",

            "doctors":
                [],

            "disclaimer":
                (
                    "This is general health navigation, "
                    "not a medical diagnosis. Consult a "
                    "qualified healthcare professional "
                    "for medical advice."
                ),
        }

    # --------------------------------------------------------
    # RULE-BASED SPECIALTY
    # --------------------------------------------------------

    rule_specialty = specialty_from_rules(
        text
    )

    # --------------------------------------------------------
    # GROQ
    # --------------------------------------------------------

    ai_result = get_groq_assessment(
        text
    )

    # --------------------------------------------------------
    # SPECIALTY SELECTION
    #
    # Strong rule-based matches take priority.
    #
    # If there is no strong rule match, Groq chooses
    # the specialty.
    # --------------------------------------------------------

    if rule_specialty != "General Physician":

        specialty = rule_specialty

    elif ai_result:

        specialty = ai_result.get(
            "specialty",
            "General Physician",
        )

    else:

        specialty = "General Physician"

    # --------------------------------------------------------
    # URGENCY / MESSAGE
    # --------------------------------------------------------

    if ai_result:

        urgency = ai_result.get(
            "urgency",
            "NORMAL",
        )

        message = ai_result.get(
            "message",
            "",
        )

    else:

        safety = safety_override(
            text,
            specialty,
        )

        urgency = safety[
            "urgency"
        ]

        message = safety[
            "message"
        ]

    # --------------------------------------------------------
    # SAFETY OVERRIDE
    # --------------------------------------------------------

    safety = safety_override(
        text,
        specialty,
    )

    if safety["urgency"] == "EMERGENCY":

        urgency = "EMERGENCY"

        message = safety[
            "message"
        ]

    elif (
        safety["urgency"] == "URGENT"
        and urgency == "NORMAL"
    ):

        urgency = "URGENT"

        message = safety[
            "message"
        ]

    # --------------------------------------------------------
    # DOCTORS
    # --------------------------------------------------------

    doctors = get_available_doctors(
        specialty,
        db,
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "specialization":
            specialty,

        "specialty":
            specialty,

        "urgency":
            urgency,

        "message":
            message,

        "doctors":
            doctors,

        "disclaimer":
            (
                "This is general health navigation, "
                "not a medical diagnosis. Consult a "
                "qualified healthcare professional "
                "for medical advice."
            ),
    }