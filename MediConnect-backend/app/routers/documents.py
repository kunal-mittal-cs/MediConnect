import os
import uuid
import zipfile
from io import BytesIO
from datetime import timezone

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
)
from fastapi.responses import Response
from sqlalchemy.orm import Session
from supabase import create_client, Client

from ..database import get_db
from ..models import MedicalDocument, Consultation
from ..dependencies import get_current_user
from ..routers.consultations import manager


router = APIRouter(
    prefix="/documents",
    tags=["Medical Documents"],
)


# =========================================================
# SUPABASE STORAGE CONFIGURATION
# =========================================================

SUPABASE_URL = os.getenv("SUPABASE_URL")

SUPABASE_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY"
)

SUPABASE_STORAGE_BUCKET = os.getenv(
    "SUPABASE_STORAGE_BUCKET",
    "mediconnect-documents",
)


if not SUPABASE_URL:
    raise RuntimeError(
        "SUPABASE_URL is missing from .env"
    )


if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "SUPABASE_SERVICE_ROLE_KEY is missing from .env"
    )


supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
)


# =========================================================
# UPLOAD LIMITS / ALLOWED FILES
# =========================================================

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/zip",
    "application/x-zip-compressed",
}


ALLOWED_EXTENSIONS = {
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".zip",
}


ALLOWED_ZIP_EXTENSIONS = {
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
}


MAX_ZIP_FILES = 20

MAX_ZIP_UNCOMPRESSED_SIZE = (
    20 * 1024 * 1024
)  # 20 MB


# =========================================================
# HELPERS
# =========================================================

def is_consultation_member(
    user,
    consultation,
):
    """
    Check whether the current user belongs
    to the consultation.
    """

    if user.role == "PATIENT":

        return (
            consultation.patient_id
            == user.id
        )


    if user.role == "DOCTOR":

        return (
            consultation.doctor_id
            and consultation.doctor.user_id
            == user.id
        )


    return False


# =========================================================
# ZIP VALIDATION
# =========================================================

def validate_zip(
    data: bytes,
):
    """
    Validate ZIP contents without extracting
    them to disk.

    ZIP may contain only:
    PDF / JPG / JPEG / PNG

    Nested ZIPs and suspicious paths
    are rejected.
    """

    try:

        with zipfile.ZipFile(
            BytesIO(data)
        ) as archive:

            members = archive.infolist()


            if not members:

                raise HTTPException(
                    status_code=400,
                    detail="ZIP file is empty",
                )


            if len(members) > MAX_ZIP_FILES:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"ZIP can contain a maximum "
                        f"of {MAX_ZIP_FILES} files"
                    ),
                )


            total_uncompressed_size = 0


            for member in members:

                filename = member.filename


                # -------------------------------------------------
                # IGNORE DIRECTORY ENTRIES
                # -------------------------------------------------

                if filename.endswith("/"):
                    continue


                # -------------------------------------------------
                # PREVENT PATH TRAVERSAL
                # -------------------------------------------------

                normalized = os.path.normpath(
                    filename
                )


                if (
                    normalized.startswith("..")
                    or os.path.isabs(normalized)
                    or ".."
                    in normalized.split(os.sep)
                ):

                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "ZIP contains an invalid "
                            "file path"
                        ),
                    )


                extension = os.path.splitext(
                    filename.lower()
                )[1]


                # -------------------------------------------------
                # NO NESTED ZIP
                # -------------------------------------------------

                if extension == ".zip":

                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Nested ZIP files are "
                            "not allowed"
                        ),
                    )


                # -------------------------------------------------
                # ONLY MEDICAL DOCUMENT TYPES
                # -------------------------------------------------

                if (
                    extension
                    not in ALLOWED_ZIP_EXTENSIONS
                ):

                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "ZIP files may contain "
                            "only PDF, JPG and PNG files"
                        ),
                    )


                total_uncompressed_size += (
                    member.file_size
                )


                if (
                    total_uncompressed_size
                    > MAX_ZIP_UNCOMPRESSED_SIZE
                ):

                    raise HTTPException(
                        status_code=413,
                        detail=(
                            "ZIP uncompressed content "
                            "exceeds the allowed limit"
                        ),
                    )


    except zipfile.BadZipFile:

        raise HTTPException(
            status_code=400,
            detail="Invalid ZIP file",
        )


# =========================================================
# UPLOAD DOCUMENT
# =========================================================

@router.post("/{consultation_id}")
async def upload(
    consultation_id: int,
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    # -----------------------------------------------------
    # FIND CONSULTATION
    # -----------------------------------------------------

    consultation = (
        db.query(Consultation)
        .filter(
            Consultation.id
            == consultation_id
        )
        .first()
    )


    if not consultation:

        raise HTTPException(
            status_code=404,
            detail="Consultation not found",
        )


    # -----------------------------------------------------
    # AUTHORIZATION
    # -----------------------------------------------------

    if not is_consultation_member(
        user,
        consultation,
    ):

        raise HTTPException(
            status_code=403,
            detail="Not authorized",
        )


    # -----------------------------------------------------
    # CHECK DOCUMENT SHARING
    # -----------------------------------------------------

    if not consultation.service.document_enabled:

        raise HTTPException(
            status_code=403,
            detail=(
                "Documents are not included "
                "in this consultation"
            ),
        )


    # -----------------------------------------------------
    # ORIGINAL FILENAME
    # -----------------------------------------------------

    original_filename = os.path.basename(
        file.filename or "document"
    )


    extension = os.path.splitext(
        original_filename.lower()
    )[1]


    # -----------------------------------------------------
    # VALIDATE EXTENSION
    # -----------------------------------------------------

    if extension not in ALLOWED_EXTENSIONS:

        raise HTTPException(
            status_code=400,
            detail=(
                "Only PDF, JPG, PNG and ZIP "
                "files are allowed"
            ),
        )


    # -----------------------------------------------------
    # VALIDATE MIME TYPE
    # -----------------------------------------------------

    content_type = file.content_type or ""


    if content_type not in ALLOWED_MIME_TYPES:

        # Some browsers send a generic ZIP MIME type.
        if extension != ".zip":

            raise HTTPException(
                status_code=400,
                detail="Unsupported file type",
            )


        content_type = "application/zip"


    # -----------------------------------------------------
    # READ FILE
    # -----------------------------------------------------

    data = await file.read()


    # -----------------------------------------------------
    # FILE SIZE
    # -----------------------------------------------------

    if len(data) > MAX_FILE_SIZE:

        raise HTTPException(
            status_code=413,
            detail=(
                "Maximum file size is 5 MB"
            ),
        )


    if len(data) == 0:

        raise HTTPException(
            status_code=400,
            detail="File is empty",
        )


    # -----------------------------------------------------
    # VALIDATE ZIP
    # -----------------------------------------------------

    if extension == ".zip":

        validate_zip(data)

        content_type = "application/zip"


    # -----------------------------------------------------
    # GENERATE UNIQUE STORAGE PATH
    # -----------------------------------------------------

    unique_name = (
        f"{uuid.uuid4().hex}_"
        f"{original_filename}"
    )


    storage_path = (
        f"consultations/"
        f"{consultation.id}/"
        f"{unique_name}"
    )


    storage_uploaded = False


    try:

        # =================================================
        # UPLOAD TO PRIVATE SUPABASE STORAGE
        # =================================================

        supabase.storage.from_(
            SUPABASE_STORAGE_BUCKET
        ).upload(
            storage_path,
            data,
            {
                "content-type": content_type,
                "upsert": False,
            },
        )


        storage_uploaded = True


        # =================================================
        # SAVE DATABASE RECORD
        # =================================================

        document = MedicalDocument(
            consultation_id=(
                consultation.id
            ),
            uploaded_by=user.id,
            file_name=original_filename,
            file_path=storage_path,
            file_type=content_type,
        )


        db.add(document)

        db.commit()

        db.refresh(document)


        # =================================================
        # REAL-TIME DOCUMENT EVENT
        # =================================================
        #
        # The consultation WebSocket is already being
        # used for real-time chat.
        #
        # We now use the same connection to tell both
        # participants that a document was shared.
        #
        # This removes the need for the doctor to refresh.
        # =================================================

        document_payload = {
            "type": "document_shared",

            "id": document.id,

            "consultation_id": (
                document.consultation_id
            ),

            "uploaded_by": (
                document.uploaded_by
            ),

            "file_name": (
                document.file_name
            ),

            "file_type": (
                document.file_type
            ),

            "file_path": (
                f"/documents/{document.id}"
            ),

            "created_at": (
                document.created_at
                .replace(
                    tzinfo=timezone.utc
                )
                .isoformat()
                if document.created_at
                else None
            ),
        }


        await manager.broadcast(
            consultation.id,
            document_payload,
        )


        # =================================================
        # RETURN UPLOAD RESULT
        # =================================================

        return {
            "id": document.id,

            "consultation_id": (
                document.consultation_id
            ),

            "uploaded_by": (
                document.uploaded_by
            ),

            "file_name": (
                document.file_name
            ),

            "file_type": (
                document.file_type
            ),

            "file_path": (
                f"/documents/{document.id}"
            ),

            "created_at": (
                document.created_at
            ),
        }


    except HTTPException:

        # Do not convert our intentional
        # validation errors into 500 errors.

        db.rollback()

        if storage_uploaded:

            try:

                supabase.storage.from_(
                    SUPABASE_STORAGE_BUCKET
                ).remove(
                    [storage_path]
                )

            except Exception:
                pass


        raise


    except Exception:

        db.rollback()


        # -------------------------------------------------
        # REMOVE STORAGE FILE IF DB OPERATION FAILED
        # -------------------------------------------------

        if storage_uploaded:

            try:

                supabase.storage.from_(
                    SUPABASE_STORAGE_BUCKET
                ).remove(
                    [storage_path]
                )

            except Exception:
                pass


        raise HTTPException(
            status_code=500,
            detail="Failed to upload document",
        )


# =========================================================
# LIST CONSULTATION DOCUMENTS
# =========================================================

@router.get(
    "/consultation/{consultation_id}"
)
def list_docs(
    consultation_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    consultation = (
        db.query(Consultation)
        .filter(
            Consultation.id
            == consultation_id
        )
        .first()
    )


    if not consultation:

        raise HTTPException(
            status_code=404,
            detail="Consultation not found",
        )


    # -----------------------------------------------------
    # AUTHORIZATION
    # -----------------------------------------------------

    if not is_consultation_member(
        user,
        consultation,
    ):

        raise HTTPException(
            status_code=403,
            detail="Not authorized",
        )


    # -----------------------------------------------------
    # GET DOCUMENTS
    # -----------------------------------------------------

    documents = (
        db.query(MedicalDocument)
        .filter(
            MedicalDocument.consultation_id
            == consultation.id
        )
        .order_by(
            MedicalDocument.created_at.asc()
        )
        .all()
    )


    result = []


    for document in documents:

        result.append(
            {
                "id": document.id,

                "consultation_id": (
                    document.consultation_id
                ),

                "uploaded_by": (
                    document.uploaded_by
                ),

                "file_name": (
                    document.file_name
                ),

                "file_path": (
                    f"/documents/{document.id}"
                ),

                "file_type": (
                    document.file_type
                ),

                "created_at": (
                    document.created_at
                ),
            }
        )


    return result


# =========================================================
# DOWNLOAD / OPEN DOCUMENT
# =========================================================

@router.get("/{document_id}")
def get_doc(
    document_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    # -----------------------------------------------------
    # FIND DOCUMENT
    # -----------------------------------------------------

    document = (
        db.query(MedicalDocument)
        .filter(
            MedicalDocument.id
            == document_id
        )
        .first()
    )


    if not document:

        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )


    # -----------------------------------------------------
    # FIND CONSULTATION
    # -----------------------------------------------------

    consultation = (
        document.consultation
    )


    if not consultation:

        raise HTTPException(
            status_code=404,
            detail="Consultation not found",
        )


    # -----------------------------------------------------
    # AUTHORIZATION
    # -----------------------------------------------------

    if not is_consultation_member(
        user,
        consultation,
    ):

        raise HTTPException(
            status_code=403,
            detail="Not authorized",
        )


    try:

        # =================================================
        # DOWNLOAD FROM PRIVATE SUPABASE STORAGE
        # =================================================

        data = (
            supabase.storage
            .from_(
                SUPABASE_STORAGE_BUCKET
            )
            .download(
                document.file_path
            )
        )


        # =================================================
        # RETURN FILE INLINE
        # =================================================

        return Response(
            content=data,

            media_type=(
                document.file_type
            ),

            headers={
                "Content-Disposition": (
                    f'inline; filename="'
                    f'{document.file_name}"'
                )
            },
        )


    except Exception:

        raise HTTPException(
            status_code=404,
            detail="Document file not found",
        )