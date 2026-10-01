import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import api from '../api';
import { dateTime, toast } from '../utils';

const getFileIcon = (fileType, fileName) => {
  const type = String(fileType || '').toLowerCase();
  const name = String(fileName || '').toLowerCase();

  if (type.includes('pdf') || name.endsWith('.pdf')) {
    return 'PDF';
  }

  if (
    type.includes('png') ||
    type.includes('jpeg') ||
    type.includes('jpg') ||
    /\.(png|jpg|jpeg)$/i.test(name)
  ) {
    return 'IMG';
  }

  return 'FILE';
};

const getFileLabel = (fileType, fileName) => {
  const type = String(fileType || '').toLowerCase();
  const name = String(fileName || '').toLowerCase();

  if (type.includes('pdf') || name.endsWith('.pdf')) {
    return 'PDF document';
  }

  if (
    type.includes('image') ||
    /\.(png|jpg|jpeg)$/i.test(name)
  ) {
    return 'Image';
  }

  return 'Medical document';
};

export default function Documents({
  consultations = [],
}) {
  const [selectedId, setSelectedId] = useState(
    consultations[0]?.id || ''
  );

  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState(null);

  /*
   * Document preview state.
   *
   * The document is fetched through Axios so the
   * Authorization header is included.
   *
   * Then a temporary Blob URL is created and shown
   * inside this page.
   */
  const [previewDocument, setPreviewDocument] =
    useState(null);

  const previewUrlRef = useRef(null);

  /*
   * Keep selected consultation valid when
   * consultations are refreshed.
   */
  useEffect(() => {
    if (!consultations.length) {
      setSelectedId('');
      return;
    }

    const exists = consultations.some(
      (item) =>
        Number(item.id) === Number(selectedId)
    );

    if (!exists) {
      setSelectedId(consultations[0].id);
    }
  }, [consultations, selectedId]);

  /*
   * Load documents for selected consultation.
   */
  useEffect(() => {
    if (!selectedId) {
      setDocuments([]);
      return;
    }

    let cancelled = false;

    const loadDocuments = async () => {
      setLoading(true);

      try {
        const response = await api.get(
          `/documents/consultation/${selectedId}`
        );

        if (!cancelled) {
          setDocuments(
            Array.isArray(response.data)
              ? response.data
              : []
          );
        }
      } catch (error) {
        if (!cancelled) {
          setDocuments([]);

          toast(
            error?.response?.data?.detail ||
              'Could not load documents.',
            'error'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  /*
   * Clean up Blob URL when the component is
   * unmounted.
   */
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        window.URL.revokeObjectURL(
          previewUrlRef.current
        );

        previewUrlRef.current = null;
      }
    };
  }, []);

  /*
   * Close the current document preview.
   */
  const closePreview = () => {
    if (previewUrlRef.current) {
      window.URL.revokeObjectURL(
        previewUrlRef.current
      );

      previewUrlRef.current = null;
    }

    setPreviewDocument(null);
  };

  /*
   * Upload document.
   *
   * Backend route:
   * POST /documents/{consultation_id}
   */
  const upload = async (event) => {
    const file =
      event.target.files?.[0];

    if (!file || !selectedId) {
      event.target.value = '';
      return;
    }

    /*
     * Backend accepts:
     * PDF, JPG, PNG
     *
     * Backend limit:
     * 5 MB
     */
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast(
        'Only PDF, JPG and PNG files are allowed.',
        'error'
      );

      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast(
        'Maximum file size is 5 MB.',
        'error'
      );

      event.target.value = '';
      return;
    }

    const formData = new FormData();

    formData.append('file', file);

    setUploading(true);

    try {
      const response = await api.post(
        `/documents/${selectedId}`,
        formData
      );

      /*
       * Add the document immediately.
       *
       * The duplicate check is important because
       * the backend may also broadcast this document
       * through WebSocket.
       */
      if (response.data) {
        setDocuments((current) => {
          const alreadyExists = current.some(
            (item) =>
              Number(item.id) ===
              Number(response.data.id)
          );

          if (alreadyExists) {
            return current;
          }

          return [
            response.data,
            ...current,
          ];
        });
      }

      toast(
        'Document uploaded successfully.'
      );
    } catch (error) {
      toast(
        error?.response?.data?.detail ||
          'Could not upload document.',
        'error'
      );
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  /*
   * Open document inside the current page.
   *
   * IMPORTANT:
   *
   * We do NOT use:
   *
   * window.open(...)
   *
   * or:
   *
   * <a href="/documents/1">
   *
   * because browser navigation does not automatically
   * include our Axios Authorization header.
   *
   * Instead:
   *
   * 1. Axios requests the protected endpoint.
   * 2. Backend verifies the logged-in user.
   * 3. Response is received as a Blob.
   * 4. Temporary Blob URL is created.
   * 5. PDF/image is rendered in this page.
   */
  const openDocument = async (document) => {
    if (!document?.id) {
      toast(
        'Document information is missing.',
        'error'
      );

      return;
    }

    /*
     * Close any previous preview first.
     */
    closePreview();

    setOpeningId(document.id);

    try {
      const response = await api.get(
        `/documents/${document.id}`,
        {
          responseType: 'blob',
        }
      );

      const contentType =
        response.headers?.['content-type'] ||
        document.file_type ||
        'application/octet-stream';

      const blob = new Blob(
        [response.data],
        {
          type: contentType,
        }
      );

      const url =
        window.URL.createObjectURL(blob);

      previewUrlRef.current = url;

      setPreviewDocument({
        ...document,
        previewUrl: url,
        previewType: contentType,
      });
    } catch (error) {
      /*
       * Axios may return the backend error itself
       * as a Blob because responseType=blob.
       */
      let message =
        'Could not open document.';

      const contentType =
        error?.response?.headers?.[
          'content-type'
        ];

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

          message =
            parsed?.detail || message;
        } catch {
          // Keep fallback message.
        }
      } else {
        message =
          error?.response?.data?.detail ||
          error?.message ||
          message;
      }

      toast(message, 'error');
    } finally {
      setOpeningId(null);
    }
  };

  const isPdf = (document) => {
    const type = String(
      document?.previewType ||
        document?.file_type ||
        ''
    ).toLowerCase();

    const name = String(
      document?.file_name || ''
    ).toLowerCase();

    return (
      type.includes('pdf') ||
      name.endsWith('.pdf')
    );
  };

  const isImage = (document) => {
    const type = String(
      document?.previewType ||
        document?.file_type ||
        ''
    ).toLowerCase();

    const name = String(
      document?.file_name || ''
    ).toLowerCase();

    return (
      type.includes('image') ||
      type.includes('png') ||
      type.includes('jpeg') ||
      type.includes('jpg') ||
      /\.(png|jpg|jpeg)$/i.test(name)
    );
  };

  return (
    <div className="documents-page">
      <div className="page-heading">
        <span className="section-kicker">
          MEDICAL RECORDS
        </span>

        <h1>Medical documents</h1>

        <p>
          View and share documents attached to
          your consultations.
        </p>
      </div>

      <div className="documents-layout">
        <aside className="document-consultations">
          <h3>Consultations</h3>

          {consultations.length ? (
            consultations.map((item) => (
              <button
                type="button"
                key={item.id}
                className={
                  Number(selectedId) ===
                  Number(item.id)
                    ? 'document-consultation active'
                    : 'document-consultation'
                }
                onClick={() =>
                  setSelectedId(item.id)
                }
              >
                <strong>
                  {item.service_title ||
                    'Consultation'}
                </strong>

                <span>
                  {item.scheduled_at
                    ? dateTime(
                        item.scheduled_at
                      )
                    : 'Remote consultation'}
                </span>
              </button>
            ))
          ) : (
            <p className="muted">
              No consultations available.
            </p>
          )}
        </aside>

        <main className="documents-main">
          <div className="documents-header">
            <div>
              <span className="section-kicker">
                SHARED FILES
              </span>

              <h2>
                Consultation documents
              </h2>

              {selectedId && (
                <p className="muted">
                  Files shared in this consultation
                  are accessible to both participants.
                </p>
              )}
            </div>

            {selectedId && (
              <label
                className={
                  uploading
                    ? 'upload-btn disabled'
                    : 'upload-btn'
                }
              >
                {uploading
                  ? 'Uploading...'
                  : 'Upload document'}

                <input
                  type="file"
                  onChange={upload}
                  disabled={uploading}
                  accept=".pdf,.png,.jpg,.jpeg"
                />
              </label>
            )}
          </div>

          {loading ? (
            <div className="loading-card">
              Loading documents...
            </div>
          ) : documents.length ? (
            <div className="document-list">
              {documents.map((document) => (
                <div
                  className="document-row"
                  key={document.id}
                >
                  <div className="document-icon">
                    {getFileIcon(
                      document.file_type,
                      document.file_name
                    )}
                  </div>

                  <div className="document-info">
                    <strong>
                      {document.file_name}
                    </strong>

                    <span>
                      {getFileLabel(
                        document.file_type,
                        document.file_name
                      )}
                      {' · '}
                      Uploaded{' '}
                      {document.created_at
                        ? dateTime(
                            document.created_at
                          )
                        : 'recently'}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="secondary-btn small"
                    onClick={() =>
                      openDocument(document)
                    }
                    disabled={
                      openingId === document.id
                    }
                  >
                    {openingId === document.id
                      ? 'Opening...'
                      : 'Open'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-card">
              <h3>
                No documents yet
              </h3>

              <p>
                Shared reports and files for
                this consultation will appear
                here.
              </p>

              {selectedId && (
                <label className="primary-btn document-upload-empty">
                  Upload first document

                  <input
                    type="file"
                    onChange={upload}
                    disabled={uploading}
                    accept=".pdf,.png,.jpg,.jpeg"
                  />
                </label>
              )}
            </div>
          )}

          {/*
           * SAME-PAGE DOCUMENT PREVIEW
           *
           * This replaces the old window.open()
           * behaviour.
           */}
          {previewDocument && (
            <div
              className="document-preview-overlay"
              role="dialog"
              aria-modal="true"
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
                    onClick={closePreview}
                  >
                    Close
                  </button>
                </div>

                <div className="document-preview-body">
                  {isPdf(previewDocument) && (
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

                  {isImage(previewDocument) && (
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

                  {!isPdf(previewDocument) &&
                    !isImage(previewDocument) && (
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
        </main>
      </div>
    </div>
  );
}