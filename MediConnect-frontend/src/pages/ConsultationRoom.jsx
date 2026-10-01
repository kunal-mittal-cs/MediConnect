import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import api from '../api';

import {
  shareLink,
  toast,
} from '../utils';

const JITSI_BASE = 'https://meet.jit.si/';
const FREE_MESSAGE_LIMIT = 10;

// =======================================================
// IST DATE/TIME FORMATTER
// =======================================================
//
// IMPORTANT:
// Your database timestamps are already stored as IST.
// Therefore we DO NOT convert them from UTC to IST.
//
// We intentionally remove any timezone suffix that may
// have been added by the backend/WebSocket and interpret
// the remaining date/time as Indian local time.
//

const formatIST = (value) => {
  if (!value) {
    return '';
  }

  try {
    let dateValue = String(value).trim();

    /*
     * Database timestamps are already IST.
     *
     * Examples:
     * 2026-10-01T20:30:00
     * 2026-10-01T20:30:00.000
     * 2026-10-01T20:30:00Z
     * 2026-10-01T20:30:00+00:00
     *
     * We intentionally remove the timezone portion
     * instead of converting it.
     */

    dateValue = dateValue
      .replace(/Z$/i, '')
      .replace(/[+-]\d{2}:\d{2}$/, '');

    /*
     * Parse the individual date/time components manually.
     *
     * This prevents the browser from applying its own
     * timezone conversion.
     */

    const match = dateValue.match(
      /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?$/
    );

    if (!match) {
      return '';
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = Number(match[6] || 0);

    if (
      !year ||
      !month ||
      !day ||
      Number.isNaN(hour) ||
      Number.isNaN(minute)
    ) {
      return '';
    }

    /*
     * Create a UTC date only so that JavaScript does not
     * apply the computer's local timezone.
     *
     * We then format the exact stored IST components.
     */

    const date = new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
        second
      )
    );

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(
      'en-IN',
      {
        timeZone: 'UTC',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }
    ).format(date);
  } catch {
    return '';
  }
};

// =======================================================
// MEETING URL
// =======================================================

const makeMeetingUrl = (id) => {
  const safeId = `MediConnect-${id}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;

  return `${JITSI_BASE}${safeId}`;
};

// =======================================================
// DOCUMENT TYPE
// =======================================================

const getDocumentType = (document) => {
  const type = String(
    document?.file_type || ''
  ).toLowerCase();

  const name = String(
    document?.file_name || ''
  ).toLowerCase();

  if (
    type.includes('pdf') ||
    name.endsWith('.pdf')
  ) {
    return 'pdf';
  }

  if (
    type.includes('image') ||
    type.includes('png') ||
    type.includes('jpeg') ||
    type.includes('jpg') ||
    /\.(png|jpg|jpeg)$/i.test(name)
  ) {
    return 'image';
  }

  return 'other';
};

export default function ConsultationRoom({
  user,
  consultation,
  onBack,
  onBookConsultation,
}) {
  // =======================================================
  // CURRENT CONSULTATION
  // =======================================================

  const [
    currentConsultation,
    setCurrentConsultation,
  ] = useState(consultation);

  const [
    socketRefreshKey,
    setSocketRefreshKey,
  ] = useState(0);

  useEffect(() => {
    setCurrentConsultation(consultation);
  }, [consultation]);

  // =======================================================
  // BASIC STATE
  // =======================================================

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [
    socketConnected,
    setSocketConnected,
  ] = useState(false);

  const [meetingLink, setMeetingLink] =
    useState(
      consultation?.meeting_link || ''
    );

  const [callMode, setCallMode] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');

  const [features, setFeatures] = useState({
    chat: false,
    voice: false,
    video: false,
    documents: false,
  });

  const [notes, setNotes] = useState({
    notes: '',
    recommendations: '',
  });

  // =======================================================
  // DOCUMENT PREVIEW STATE
  // =======================================================

  const [
    previewDocument,
    setPreviewDocument,
  ] = useState(null);

  const [
    openingDocumentId,
    setOpeningDocumentId,
  ] = useState(null);

  const previewUrlRef = useRef(null);

  // =======================================================
  // AI FREE CHAT STATE
  // =======================================================

  const [
    freeLimitReached,
    setFreeLimitReached,
  ] = useState(false);

  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const consultationId =
    currentConsultation?.id;

  const isAIFreeChat =
    Boolean(
      currentConsultation?.is_ai_free_chat
    );

  const freeMessagesUsed =
    isAIFreeChat
      ? messages.filter(
          (item) =>
            Number(item.sender_id) ===
            Number(
              currentConsultation?.patient_id
            )
        ).length
      : 0;

  const hasReachedFreeLimit =
    isAIFreeChat &&
    (
      freeLimitReached ||
      freeMessagesUsed >= FREE_MESSAGE_LIMIT
    );

  // =======================================================
  // LOAD CONSULTATION DATA
  // =======================================================

  const load = async () => {
    if (!consultationId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const results =
        await Promise.allSettled([
          api.get(
            `/consultations/${consultationId}/messages`
          ),

          api.get(
            `/consultations/${consultationId}/features`
          ),

          api.get(
            `/consultations/${consultationId}/notes`
          ),

          api.get(
            `/documents/consultation/${consultationId}`
          ),
        ]);

      // ---------------------------------------------------
      // MESSAGES
      // ---------------------------------------------------

      if (
        results[0].status ===
        'fulfilled'
      ) {
        const data =
          results[0].value.data;

        setMessages(
          Array.isArray(data)
            ? data
            : []
        );
      }

      // ---------------------------------------------------
      // FEATURES
      // ---------------------------------------------------

      if (
        results[1].status ===
        'fulfilled'
      ) {
        const data =
          results[1].value.data || {};

        setFeatures({
          chat: Boolean(
            data.chat_enabled ??
              data.chat
          ),

          voice: Boolean(
            data.voice_enabled ??
              data.voice
          ),

          video: Boolean(
            data.video_enabled ??
              data.video
          ),

          documents: Boolean(
            data.document_enabled ??
              data.documents
          ),
        });
      }

      // ---------------------------------------------------
      // NOTES
      // ---------------------------------------------------

      if (
        results[2].status ===
        'fulfilled'
      ) {
        const data =
          results[2].value.data || {};

        setNotes({
          notes:
            data.notes || '',

          recommendations:
            data.recommendations || '',
        });
      }

      // ---------------------------------------------------
      // DOCUMENTS
      // ---------------------------------------------------

      if (
        results[3].status ===
        'fulfilled'
      ) {
        const data =
          results[3].value.data;

        setDocuments(
          Array.isArray(data)
            ? data
            : []
        );
      }
    } catch (error) {
      console.error(
        'Could not load consultation:',
        error
      );

      toast(
        'Could not load consultation data.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [consultationId]);

  // =======================================================
  // DETECT FREE CHAT LIMIT
  // =======================================================

  useEffect(() => {
    if (
      isAIFreeChat &&
      freeMessagesUsed >= FREE_MESSAGE_LIMIT
    ) {
      setFreeLimitReached(true);
    }
  }, [
    isAIFreeChat,
    freeMessagesUsed,
  ]);

  // =======================================================
  // WEBSOCKET CHAT + DOCUMENT EVENTS
  // =======================================================

  useEffect(() => {
    if (
      !consultationId ||
      !features.chat
    ) {
      return;
    }

    const token =
      localStorage.getItem(
        'access_token'
      );

    if (!token) {
      return;
    }

    let cancelled = false;

    const connectSocket = () => {
      if (cancelled) {
        return;
      }

      const apiBase =
        import.meta.env.VITE_API_URL ||
        'http://127.0.0.1:8000';

      const wsBase =
        import.meta.env.VITE_WS_URL ||
        apiBase
          .replace(
            /^https:\/\//,
            'wss://'
          )
          .replace(
            /^http:\/\//,
            'ws://'
          );

      const socketUrl =
        `${wsBase}/consultations/${consultationId}/ws` +
        `?token=${encodeURIComponent(token)}`;

      const socket =
        new WebSocket(socketUrl);

      socketRef.current =
        socket;

      // ---------------------------------------------------
      // SOCKET OPEN
      // ---------------------------------------------------

      socket.onopen = () => {
        if (cancelled) {
          socket.close();
          return;
        }

        setSocketConnected(true);
      };

      // ---------------------------------------------------
      // SOCKET MESSAGE
      // ---------------------------------------------------

      socket.onmessage = (event) => {
        try {
          const data =
            JSON.parse(event.data);

          // ===============================================
          // NORMAL CHAT MESSAGE
          // ===============================================

          if (
            data.type === 'message'
          ) {
            setMessages(
              (current) => {
                const exists =
                  current.some(
                    (item) =>
                      Number(item.id) ===
                      Number(data.id)
                  );

                if (exists) {
                  return current;
                }

                return [
                  ...current,
                  {
                    id: data.id,

                    consultation_id:
                      data.consultation_id,

                    sender_id:
                      data.sender_id,

                    message:
                      data.message,

                    created_at:
                      data.created_at,
                  },
                ];
              }
            );

            return;
          }

          // ===============================================
          // DOCUMENT SHARED
          // ===============================================

          if (
            data.type ===
            'document_shared'
          ) {
            setDocuments(
              (current) => {
                const exists =
                  current.some(
                    (item) =>
                      Number(item.id) ===
                      Number(data.id)
                  );

                if (exists) {
                  return current;
                }

                const newDocument = {
                  id: data.id,

                  consultation_id:
                    data.consultation_id,

                  uploaded_by:
                    data.uploaded_by,

                  file_name:
                    data.file_name,

                  file_type:
                    data.file_type,

                  file_path:
                    data.file_path,

                  created_at:
                    data.created_at,
                };

                return [
                  ...current,
                  newDocument,
                ];
              }
            );

            toast(
              `New document shared: ${
                data.file_name ||
                'Medical document'
              }`
            );

            return;
          }

          // ===============================================
          // FREE CHAT LIMIT
          // ===============================================

          if (
            data.type ===
            'free_limit_reached'
          ) {
            setFreeLimitReached(true);
            setMessage('');

            return;
          }

          // ===============================================
          // WEBSOCKET ERROR
          // ===============================================

          if (
            data.type === 'error'
          ) {
            toast(
              data.message ||
                'Chat error.',
              'error'
            );
          }
        } catch (error) {
          console.error(
            'Invalid WebSocket message:',
            error
          );
        }
      };

      // ---------------------------------------------------
      // SOCKET CLOSE
      // ---------------------------------------------------

      socket.onclose = () => {
        if (cancelled) {
          return;
        }

        setSocketConnected(false);

        reconnectTimerRef.current =
          setTimeout(() => {
            connectSocket();
          }, 2000);
      };

      // ---------------------------------------------------
      // SOCKET ERROR
      // ---------------------------------------------------

      socket.onerror = () => {
        setSocketConnected(false);
      };
    };

    connectSocket();

    return () => {
      cancelled = true;

      if (
        reconnectTimerRef.current
      ) {
        clearTimeout(
          reconnectTimerRef.current
        );

        reconnectTimerRef.current =
          null;
      }

      if (
        socketRef.current
      ) {
        socketRef.current.close();
        socketRef.current = null;
      }

      setSocketConnected(false);
    };
  }, [
    consultationId,
    features.chat,
    isAIFreeChat,
    socketRefreshKey,
  ]);

  // =======================================================
  // SEND MESSAGE
  // =======================================================

  const sendMessage = async (
    event
  ) => {
    event.preventDefault();

    const text =
      String(message || '').trim();

    if (
      !text ||
      sending ||
      !features.chat
    ) {
      return;
    }

    if (
      isAIFreeChat &&
      hasReachedFreeLimit
    ) {
      setFreeLimitReached(true);
      setMessage('');

      return;
    }

    if (
      !socketRef.current ||
      socketRef.current.readyState !==
        WebSocket.OPEN
    ) {
      toast(
        'Chat connection is not ready. Please try again.',
        'error'
      );

      return;
    }

    setSending(true);

    try {
      socketRef.current.send(
        JSON.stringify({
          message: text,
        })
      );

      setMessage('');
    } catch (error) {
      console.error(
        'Could not send message:',
        error
      );

      toast(
        'Could not send message.',
        'error'
      );
    } finally {
      setSending(false);
    }
  };

  // =======================================================
  // START / JOIN CALL
  // =======================================================

  const startCall = async (
    mode
  ) => {
    if (
      mode === 'video' &&
      !features.video
    ) {
      toast(
        'Video is not included in this service.',
        'error'
      );

      return;
    }

    if (
      mode === 'voice' &&
      !features.voice
    ) {
      toast(
        'Voice is not included in this service.',
        'error'
      );

      return;
    }

    try {
      let link =
        meetingLink;

      if (!link) {
        if (
          user?.role !== 'DOCTOR'
        ) {
          toast(
            'Waiting for the doctor to start the call.',
            'error'
          );

          return;
        }

        link =
          makeMeetingUrl(
            consultationId
          );

        const response =
          await api.put(
            `/consultations/${consultationId}/meeting`,
            {
              meeting_link: link,
            }
          );

        setMeetingLink(
          response.data?.meeting_link ||
            link
        );
      }

      setCallMode(mode);
    } catch (error) {
      console.error(
        'Start call error:',
        error
      );

      toast(
        error.response?.data?.detail ||
          'Could not start the call.',
        'error'
      );
    }
  };

  // =======================================================
  // UPLOAD DOCUMENT
  // =======================================================

  const uploadDocument = async (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (
      !file ||
      !features.documents
    ) {
      event.target.value = '';
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      toast(
        'Only PDF, JPG and PNG files are allowed.',
        'error'
      );

      event.target.value = '';

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      toast(
        'Maximum file size is 5 MB.',
        'error'
      );

      event.target.value = '';

      return;
    }

    const formData =
      new FormData();

    formData.append(
      'file',
      file
    );

    setUploading(true);

    try {
      const response =
        await api.post(
          `/documents/${consultationId}`,
          formData
        );

      // Add immediately for uploader.
      // WebSocket event will be ignored if
      // this document already exists.
      if (response.data) {
        setDocuments(
          (current) => {
            const exists =
              current.some(
                (item) =>
                  Number(item.id) ===
                  Number(
                    response.data.id
                  )
              );

            if (exists) {
              return current;
            }

            return [
              response.data,
              ...current,
            ];
          }
        );
      }

      toast(
        'Document uploaded.'
      );
    } catch (error) {
      console.error(
        'Document upload error:',
        error
      );

      toast(
        error.response?.data?.detail ||
          'Could not upload document.',
        'error'
      );
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  // =======================================================
  // OPEN DOCUMENT
  // =======================================================

  const openDocument = async (
    document
  ) => {
    if (!document?.id) {
      toast(
        'Document information is missing.',
        'error'
      );

      return;
    }

    // Close existing preview first.
    closeDocumentPreview();

    setOpeningDocumentId(
      document.id
    );

    try {
      // IMPORTANT:
      // Use Axios so api.js can attach the JWT.
      const response =
        await api.get(
          `/documents/${document.id}`,
          {
            responseType: 'blob',
          }
        );

      const contentType =
        response.headers?.[
          'content-type'
        ] ||
        document.file_type ||
        'application/octet-stream';

      const blob =
        new Blob(
          [response.data],
          {
            type: contentType,
          }
        );

      const url =
        window.URL.createObjectURL(
          blob
        );

      previewUrlRef.current =
        url;

      setPreviewDocument({
        ...document,
        previewUrl: url,
        previewType: contentType,
      });
    } catch (error) {
      let errorMessage =
        'Could not open document.';

      const contentType =
        error?.response?.headers?.[
          'content-type'
        ];

      // Axios returns FastAPI JSON errors as Blob
      // because responseType is blob.
      if (
        contentType?.includes(
          'application/json'
        ) &&
        error?.response?.data instanceof Blob
      ) {
        try {
          const text =
            await error.response.data.text();

          const parsed =
            JSON.parse(text);

          errorMessage =
            parsed?.detail ||
            errorMessage;
        } catch {
          // Keep fallback.
        }
      } else {
        errorMessage =
          error?.response?.data?.detail ||
          error?.message ||
          errorMessage;
      }

      toast(
        errorMessage,
        'error'
      );
    } finally {
      setOpeningDocumentId(null);
    }
  };

  // =======================================================
  // CLOSE DOCUMENT PREVIEW
  // =======================================================

  const closeDocumentPreview = () => {
    if (
      previewUrlRef.current
    ) {
      window.URL.revokeObjectURL(
        previewUrlRef.current
      );

      previewUrlRef.current =
        null;
    }

    setPreviewDocument(null);
  };

  // =======================================================
  // CLEAN DOCUMENT PREVIEW URL
  // =======================================================

  useEffect(() => {
    return () => {
      if (
        previewUrlRef.current
      ) {
        window.URL.revokeObjectURL(
          previewUrlRef.current
        );

        previewUrlRef.current =
          null;
      }
    };
  }, []);

  // =======================================================
  // SAVE NOTES
  // =======================================================

  const saveNotes = async () => {
    try {
      await api.post(
        `/consultations/${consultationId}/notes`,
        notes
      );

      toast(
        'Consultation notes saved.'
      );
    } catch (error) {
      toast(
        error.response?.data?.detail ||
          'Could not save consultation notes.',
        'error'
      );
    }
  };

  // =======================================================
  // UPDATE CONSULTATION STATUS
  // =======================================================

  const updateStatus = async (
    status
  ) => {
    try {
      await api.put(
        `/consultations/${consultationId}/status`,
        {
          status,
        }
      );

      toast(
        status === 'COMPLETED'
          ? 'Consultation completed.'
          : 'Consultation marked ongoing.'
      );
    } catch (error) {
      toast(
        error.response?.data?.detail ||
          'Could not update consultation.',
        'error'
      );
    }
  };

  // =======================================================
  // BOOK NORMAL CONSULTATION
  // =======================================================

  const handleBookConsultation =
    async () => {
      const doctorId =
        currentConsultation?.doctor_id;

      if (!doctorId) {
        toast(
          'Doctor information is not available.',
          'error'
        );

        return;
      }

      try {
        const response =
          await api.get(
            '/doctors/discover'
          );

        const doctors =
          Array.isArray(response.data)
            ? response.data
            : [];

        const doctor =
          doctors.find(
            (item) =>
              Number(item.id) ===
              Number(doctorId)
          );

        if (!doctor) {
          toast(
            'The selected doctor is no longer available.',
            'error'
          );

          return;
        }

        onBookConsultation?.({
          ...doctor,
          id: Number(doctorId),
        });
      } catch (error) {
        console.error(
          'Could not load doctor for booking:',
          error
        );

        toast(
          error.response?.data?.detail ||
            'Could not load doctor information.',
          'error'
        );
      }
    };

  // =======================================================
  // EMPTY STATE
  // =======================================================

  if (!currentConsultation) {
    return (
      <div className="empty-card">
        <h3>
          Consultation not found
        </h3>
      </div>
    );
  }

  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="consultation-page">

      {/* HEADER */}

      <div className="consultation-top">

        <div className="consultation-heading">

          <button
            type="button"
            className="back-btn"
            onClick={onBack}
          >
            ← Back
          </button>

          <span className="section-kicker">
            CONSULTATION
          </span>

          <h1>
            {currentConsultation.service_title ||
              'Consultation'}
          </h1>

          <p>
            {currentConsultation.scheduled_at
              ? formatIST(
                  currentConsultation.scheduled_at
                )
              : 'Remote healthcare consultation'}
          </p>

        </div>

        <span className="consultation-status">
          {currentConsultation.status}
        </span>

      </div>

      {/* LIVE CALL */}

      {callMode &&
      meetingLink ? (

        <section className="live-call-panel">

          <div className="live-call-header">

            <div>

              <span className="section-kicker">
                LIVE{' '}
                {callMode === 'voice'
                  ? 'VOICE'
                  : 'VIDEO'}{' '}
                CALL
              </span>

              <h2>
                MediConnect consultation
              </h2>

            </div>

            <button
              type="button"
              className="danger-btn"
              onClick={() =>
                setCallMode(null)
              }
            >
              Leave call
            </button>

          </div>

          <div className="jitsi-container">

            <iframe
              title="MediConnect consultation"
              src={
                callMode === 'voice'
                  ? `${meetingLink}#config.startWithVideoMuted=true`
                  : meetingLink
              }
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="jitsi-frame"
            />

          </div>

        </section>

      ) : (

        <div className="consultation-layout">

          {/* MAIN */}

          <main className="consultation-content">

            {/* MOBILE-FRIENDLY TOOLBAR */}

            <div className="consultation-tabs">

              {features.chat && (

                <button
                  type="button"
                  className={
                    activeTab === 'chat'
                      ? 'consultation-tab active'
                      : 'consultation-tab'
                  }
                  onClick={() =>
                    setActiveTab('chat')
                  }
                >
                  <span className="consultation-tab-icon">
                    💬
                  </span>

                  <span>
                    Chat
                  </span>
                </button>

              )}

              {features.documents && (

                <button
                  type="button"
                  className={
                    activeTab === 'documents'
                      ? 'consultation-tab active'
                      : 'consultation-tab'
                  }
                  onClick={() =>
                    setActiveTab(
                      'documents'
                    )
                  }
                >
                  <span className="consultation-tab-icon">
                    📄
                  </span>

                  <span>
                    Documents
                  </span>
                </button>

              )}

              {features.voice && (

                <button
                  type="button"
                  className="consultation-tab call-tab"
                  onClick={() =>
                    startCall('voice')
                  }
                >
                  <span className="consultation-tab-icon">
                    🎙
                  </span>

                  <span>
                    {user?.role ===
                    'DOCTOR'
                      ? 'Voice'
                      : meetingLink
                        ? 'Join voice'
                        : 'Voice'}
                  </span>
                </button>

              )}

              {features.video && (

                <button
                  type="button"
                  className="consultation-tab call-tab"
                  onClick={() =>
                    startCall('video')
                  }
                >
                  <span className="consultation-tab-icon">
                    ▷
                  </span>

                  <span>
                    {user?.role ===
                    'DOCTOR'
                      ? 'Video'
                      : meetingLink
                        ? 'Join video'
                        : 'Video'}
                  </span>
                </button>

              )}

            </div>

            {/* CHAT */}

            {activeTab === 'chat' &&
              features.chat && (

                <section className="consultation-chat">

                  <div className="chat-title">

                    <div className="chat-title-main">

                      <span className="section-kicker">
                        MESSAGES
                      </span>

                      <h2>
                        Consultation chat
                      </h2>

                      <p>
                        Your conversation is
                        linked to this
                        consultation.
                      </p>

                    </div>

                    <div
                      className={
                        socketConnected
                          ? 'chat-connection connected'
                          : 'chat-connection'
                      }
                    >
                      <span />

                      {socketConnected
                        ? 'Live'
                        : 'Reconnecting'}

                    </div>

                  </div>

                  {/* AI FREE CHAT */}

                  {isAIFreeChat && (

                    <div className="ai-free-chat-status">

                      <div>

                        <strong>
                          Free consultation
                        </strong>

                        <span>
                          {Math.min(
                            freeMessagesUsed,
                            FREE_MESSAGE_LIMIT
                          )}{' '}
                          of{' '}
                          {FREE_MESSAGE_LIMIT}{' '}
                          messages used
                        </span>

                      </div>

                      <div className="ai-free-chat-counter">
                        {Math.min(
                          freeMessagesUsed,
                          FREE_MESSAGE_LIMIT
                        )}
                        /
                        {FREE_MESSAGE_LIMIT}
                      </div>

                    </div>

                  )}

                  {/* MESSAGES */}

                  <div className="messages">

                    {loading ? (

                      <div className="loading-card">
                        Loading messages...
                      </div>

                    ) : messages.length ? (

                      messages.map(
                        (item) => {

                          const own =
                            Number(
                              item.sender_id
                            ) ===
                            Number(
                              user?.id
                            );

                          return (
                            <div
                              key={
                                item.id
                              }
                              className={
                                own
                                  ? 'message own'
                                  : 'message'
                              }
                            >

                              <div className="message-body">
                                {item.message}
                              </div>

                              <small>
                                {item.created_at
                                  ? formatIST(
                                      item.created_at
                                    )
                                  : ''}
                              </small>

                            </div>
                          );
                        }
                      )

                    ) : (

                      <div className="chat-empty">

                        <div className="chat-empty-icon">
                          💬
                        </div>

                        <strong>
                          Start the
                          conversation
                        </strong>

                        <p>
                          Send a message to
                          the other
                          participant.
                        </p>

                      </div>

                    )}

                  </div>

                  {/* FREE LIMIT */}

                  {hasReachedFreeLimit &&
                    user?.role ===
                      'PATIENT' && (

                    <div className="ai-upgrade-panel">

                      <div className="ai-upgrade-panel-header">

                        <span className="section-kicker">
                          FREE LIMIT REACHED
                        </span>

                        <h3>
                          Your free messages are used.
                        </h3>

                        <p>
                          Continue with a paid consultation
                          with this doctor.
                        </p>

                      </div>

                      <div className="ai-book-consultation-option">

                        <div>

                          <strong>
                            Book a consultation
                          </strong>

                          <span>
                            Choose a service, date and
                            available time with this doctor.
                          </span>

                        </div>

                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={
                            handleBookConsultation
                          }
                        >
                          Book Consultation
                        </button>

                      </div>

                    </div>

                  )}

                  {/* MESSAGE FORM */}

                  {!hasReachedFreeLimit && (

                    <form
                      className="message-form"
                      onSubmit={
                        sendMessage
                      }
                    >

                      <input
                        value={message}
                        onChange={(
                          event
                        ) =>
                          setMessage(
                            event.target.value
                          )
                        }
                        placeholder="Write a message..."
                        maxLength={5000}
                        aria-label="Write a message"
                      />

                      <button
                        type="submit"
                        className="primary-btn"
                        disabled={
                          sending ||
                          !String(
                            message || ''
                          ).trim() ||
                          !socketConnected
                        }
                      >
                        {sending
                          ? 'Sending...'
                          : 'Send'}
                      </button>

                    </form>

                  )}

                </section>

              )}

            {/* DOCUMENTS */}

            {activeTab === 'documents' &&
              features.documents && (

                <section className="consultation-documents">

                  <div className="chat-title">

                    <div>

                      <span className="section-kicker">
                        FILES
                      </span>

                      <h2>
                        Shared documents
                      </h2>

                      <p>
                        Documents shared in
                        this consultation.
                      </p>

                    </div>

                    <label className="upload-btn">

                      {uploading
                        ? 'Uploading...'
                        : 'Upload document'}

                      <input
                        type="file"
                        onChange={
                          uploadDocument
                        }
                        disabled={
                          uploading
                        }
                        accept=".pdf,.png,.jpg,.jpeg"
                      />

                    </label>

                  </div>

                  {documents.length ? (

                    <div className="document-list">

                      {documents.map(
                        (document) => (

                          <div
                            className="document-row"
                            key={
                              document.id
                            }
                          >

                            <div className="document-icon">

                              {getDocumentType(
                                document
                              ) === 'pdf'
                                ? 'PDF'
                                : getDocumentType(
                                    document
                                  ) === 'image'
                                  ? 'IMG'
                                  : 'DOC'}

                            </div>

                            <div className="document-info">

                              <strong>
                                {
                                  document.file_name
                                }
                              </strong>

                              <span>
                                {document.created_at
                                  ? formatIST(
                                      document.created_at
                                    )
                                  : ''}
                              </span>

                            </div>

                            <button
                              type="button"
                              className="secondary-btn small"
                              onClick={() =>
                                openDocument(
                                  document
                                )
                              }
                              disabled={
                                openingDocumentId ===
                                document.id
                              }
                            >
                              {openingDocumentId ===
                              document.id
                                ? 'Opening...'
                                : 'Open'}
                            </button>

                          </div>

                        )
                      )}

                    </div>

                  ) : (

                    <div className="empty-inner">

                      <strong>
                        No shared documents
                      </strong>

                      <p>
                        Upload a report or
                        medical document for
                        the consultation.
                      </p>

                    </div>

                  )}

                </section>

              )}

          </main>

          {/* SIDEBAR */}

          <aside className="consultation-sidebar">

            <section className="detail-card">

              <span className="section-kicker">
                DETAILS
              </span>

              <h3>
                Consultation details
              </h3>

              <div className="detail-row">

                <span>
                  Service
                </span>

                <strong>
                  {currentConsultation.service_title ||
                    'Consultation'}
                </strong>

              </div>

              <div className="detail-row">

                <span>
                  Duration
                </span>

                <strong>
                  {currentConsultation.duration_value
                    ? `${currentConsultation.duration_value} ${String(
                        currentConsultation.duration_unit ||
                          'MINUTES'
                      ).toLowerCase()}`
                    : `${
                        currentConsultation.duration_minutes ||
                        30
                      } minutes`}
                </strong>

              </div>

              {currentConsultation.scheduled_at && (

                <div className="detail-row">

                  <span>
                    Scheduled
                  </span>

                  <strong>
                    {formatIST(
                      currentConsultation.scheduled_at
                    )}
                  </strong>

                </div>

              )}

            </section>

            {meetingLink && (

              <section className="detail-card">

                <span className="section-kicker">
                  MEETING
                </span>

                <button
                  type="button"
                  className="secondary-btn full"
                  onClick={() =>
                    shareLink(
                      meetingLink,
                      'MediConnect consultation'
                    )
                  }
                >
                  Share meeting link
                </button>

              </section>

            )}

            {user?.role ===
              'DOCTOR' && (

              <>

                <section className="detail-card">

                  <span className="section-kicker">
                    CLINICAL NOTES
                  </span>

                  <h3>
                    Doctor notes
                  </h3>

                  <label>

                    Notes

                    <textarea
                      rows="5"
                      value={
                        notes.notes
                      }
                      onChange={(
                        event
                      ) =>
                        setNotes(
                          (current) => ({
                            ...current,
                            notes:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    />

                  </label>

                  <label>

                    Recommendations

                    <textarea
                      rows="5"
                      value={
                        notes.recommendations
                      }
                      onChange={(
                        event
                      ) =>
                        setNotes(
                          (current) => ({
                            ...current,
                            recommendations:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    />

                  </label>

                  <button
                    type="button"
                    className="primary-btn full"
                    onClick={
                      saveNotes
                    }
                  >
                    Save notes
                  </button>

                </section>

                <section className="detail-card">

                  <span className="section-kicker">
                    WORKFLOW
                  </span>

                  <button
                    type="button"
                    className="secondary-btn full"
                    onClick={() =>
                      updateStatus(
                        'ONGOING'
                      )
                    }
                  >
                    Mark ongoing
                  </button>

                  <button
                    type="button"
                    className="danger-btn full"
                    onClick={() =>
                      updateStatus(
                        'COMPLETED'
                      )
                    }
                  >
                    Complete consultation
                  </button>

                </section>

              </>

            )}

          </aside>

        </div>

      )}

      {/* ===================================================
          DOCUMENT PREVIEW
          =================================================== */}

      {previewDocument && (

        <div
          className="document-preview-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDocumentPreview();
            }
          }}
        >

          <div className="document-preview-panel">

            <div className="document-preview-header">

              <div>

                <span className="section-kicker">
                  DOCUMENT PREVIEW
                </span>

                <h3>
                  {previewDocument.file_name}
                </h3>

              </div>

              <button
                type="button"
                className="secondary-btn small"
                onClick={
                  closeDocumentPreview
                }
              >
                Close
              </button>

            </div>

            <div className="document-preview-body">

              {getDocumentType(
                previewDocument
              ) === 'pdf' && (

                <iframe
                  src={
                    previewDocument.previewUrl
                  }
                  title={
                    previewDocument.file_name
                  }
                  className="document-pdf-preview"
                />

              )}

              {getDocumentType(
                previewDocument
              ) === 'image' && (

                <img
                  src={
                    previewDocument.previewUrl
                  }
                  alt={
                    previewDocument.file_name
                  }
                  className="document-image-preview"
                />

              )}

              {getDocumentType(
                previewDocument
              ) === 'other' && (

                <div className="empty-card">

                  <h3>
                    Preview unavailable
                  </h3>

                  <p>
                    This file type cannot be
                    previewed inside MediConnect.
                  </p>

                </div>

              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}