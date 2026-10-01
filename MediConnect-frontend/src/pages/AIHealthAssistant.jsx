import React, { useState } from 'react';
import api from '../api';
import { toast } from '../utils';

const PROMPTS = [
  'Skin rash or itching',
  'Eye or vision problem',
  'Ear or throat problem',
  'Chest discomfort',
];

export default function AIHealthAssistant({
  onBook,
  onOpenConsultation,
}) {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [startingChat, setStartingChat] = useState(null);

  const submit = async () => {
    const message = text.trim();

    if (!message) {
      toast(
        'Please describe what you are experiencing.',
        'error'
      );
      return;
    }

    setBusy(true);

    try {
      const response = await api.post(
        '/ai/health-assessment',
        {
          message,
        }
      );

      setResult(response.data || null);
    } catch (error) {
      console.error(
        'AI assessment error:',
        error
      );

      toast(
        error.response?.data?.detail ||
          'Assessment unavailable. Please try again.',
        'error'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submit();
  };

  const reset = () => {
    setResult(null);
    setText('');
    setStartingChat(null);
  };

  // ==========================================================
  // START AI FREE CHAT
  // ==========================================================

  const startFreeChat = async (doctor) => {
    if (!doctor?.id) {
      toast(
        'Doctor information is unavailable.',
        'error'
      );
      return;
    }

    if (!doctor?.free_chat_service_id) {
      toast(
        'Free chat is currently unavailable for this doctor.',
        'error'
      );
      return;
    }

    setStartingChat(doctor.id);

    try {
      const response = await api.post(
        '/consultations/ai-free-chat',
        {
          doctor_id: doctor.id,
          service_id: doctor.free_chat_service_id,
        }
      );

      const consultation = response.data;

      toast(
        'Free consultation started successfully.',
        'success'
      );

      // Open the existing ConsultationRoom.
      // PatientDashboard will handle the page change.
      onOpenConsultation?.(consultation);

    } catch (error) {
      console.error(
        'AI free chat error:',
        error
      );

      toast(
        error.response?.data?.detail ||
          'Unable to start free chat. Please try again.',
        'error'
      );
    } finally {
      setStartingChat(null);
    }
  };

  const specialty =
    result?.specialization ||
    result?.specialty ||
    'General Physician';

  const urgency =
    result?.urgency ||
    'NORMAL';

  const doctors =
    Array.isArray(result?.doctors)
      ? result.doctors
      : [];

  const urgencyInfo = {
    NORMAL: {
      label: 'Regular care',
      className: 'normal',
    },

    URGENT: {
      label: 'Prompt attention',
      className: 'urgent',
    },

    EMERGENCY: {
      label: 'Emergency care',
      className: 'emergency',
    },
  };

  const care =
    urgencyInfo[urgency] ||
    urgencyInfo.NORMAL;

  const guidance =
    result?.message ||
    'A healthcare professional can assess your symptoms and guide you on the appropriate next steps.';

  return (
    <div className="ai-assistant-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="ai-assistant-header">

        <div className="ai-assistant-label">
          AI HEALTH NAVIGATION
        </div>

        <h1>
          How can we help you today?
        </h1>

        <p>
          Describe what you're experiencing and we'll help
          you find the most relevant type of care.
        </p>

      </header>


      {/* ======================================================
          INPUT
      ====================================================== */}

      <section className="ai-input-card">

        <div className="ai-section-heading">
          <h2>
            Describe your concern
          </h2>
        </div>

        <form onSubmit={handleSubmit}>

          <textarea
            value={text}
            onChange={(event) =>
              setText(event.target.value)
            }
            placeholder="Tell us what you're experiencing..."
            maxLength={5000}
            disabled={busy}
          />

          <div className="ai-example-row">

            <span>
              Examples
            </span>

            <div className="ai-example-buttons">

              {PROMPTS.map((prompt) => (

                <button
                  key={prompt}
                  type="button"
                  onClick={() =>
                    setText(prompt)
                  }
                  disabled={busy}
                >
                  {prompt}
                </button>

              ))}

            </div>

          </div>

          <button
            type="submit"
            className="ai-primary-button"
            disabled={
              busy ||
              !text.trim()
            }
          >

            {busy ? (
              <>
                <span className="ai-loading-spinner" />
                Analyzing...
              </>
            ) : (
              <>
                Get healthcare guidance
                <span>→</span>
              </>
            )}

          </button>

        </form>

      </section>


      {/* ======================================================
          RESULT
      ====================================================== */}

      {result && (

        <section className="ai-result-section">

          {/* RESULT HEADER */}

          <div className="ai-result-header">

            <div>

              <span className="ai-result-label">
                YOUR GUIDANCE
              </span>

              <h2>
                Healthcare guidance
              </h2>

            </div>

            <button
              type="button"
              className="ai-reset-button"
              onClick={reset}
            >
              Start again
            </button>

          </div>


          {/* ==================================================
              SUMMARY
          ================================================== */}

          <div className="ai-summary">

            <div className="ai-summary-item">

              <span>
                Suggested specialty
              </span>

              <strong>
                {specialty}
              </strong>

            </div>


            <div
              className={`ai-summary-item ${care.className}`}
            >

              <span>
                Care guidance
              </span>

              <strong>
                {care.label}
              </strong>

            </div>

          </div>


          {/* ==================================================
              GUIDANCE
          ================================================== */}

          <div
            className={`ai-guidance ${care.className}`}
          >

            <p>
              {guidance}
            </p>

          </div>


          {/* ==================================================
              EMERGENCY
          ================================================== */}

          {urgency === 'EMERGENCY' && (

            <div className="ai-emergency">

              <strong>
                Seek emergency medical care
              </strong>

              <p>
                Please do not rely on this AI assessment
                in an emergency. Contact local emergency
                services or visit the nearest emergency
                department.
              </p>

            </div>

          )}


          {/* ==================================================
              DOCTORS
          ================================================== */}

          {doctors.length > 0 && (

            <div className="ai-doctors-section">

              <div className="ai-doctors-header">

                <div>

                  <span className="ai-result-label">
                    AVAILABLE DOCTORS
                  </span>

                  <h3>
                    Verified doctors
                  </h3>

                </div>

                <span className="ai-doctor-count">
                  {doctors.length}
                </span>

              </div>


              {/* =================================================
                  AI-SPECIFIC DOCTOR CARDS

                  IMPORTANT:
                  This is NOT DoctorCard.jsx.

                  Normal Find a Doctor cards remain untouched.
              ================================================= */}

              <div className="ai-doctors-grid">

                {doctors.map((doctor) => {

                  const isStarting =
                    startingChat === doctor.id;

                  return (

                    <article
                      key={doctor.id}
                      className="ai-doctor-card"
                    >

                      {/* DOCTOR INFO */}

                      <div className="ai-doctor-card-top">

                        <div className="ai-doctor-avatar">
                          {doctor.name
                            ?.charAt(0)
                            ?.toUpperCase() || 'D'}
                        </div>

                        <div>

                          <h4>
                            {doctor.name}
                          </h4>

                          <span>
                            {doctor.specialization}
                          </span>

                        </div>

                      </div>


                      {/* DETAILS */}

                      <div className="ai-doctor-details">

                        {doctor.qualification && (

                          <div>
                            <span>
                              Qualification
                            </span>

                            <strong>
                              {doctor.qualification}
                            </strong>
                          </div>

                        )}

                        {doctor.experience !== undefined && (

                          <div>
                            <span>
                              Experience
                            </span>

                            <strong>
                              {doctor.experience} years
                            </strong>
                          </div>

                        )}

                      </div>


                      {/* BIO */}

                      {doctor.bio && (

                        <p className="ai-doctor-bio">
                          {doctor.bio}
                        </p>

                      )}


                      {/* CONSULTATION PRICE */}

                      <div className="ai-doctor-price">

                        <span>
                          Consultation
                        </span>

                        <strong>
                          ₹
                          {Number(
                            doctor.consultation_fee || 0
                          ).toLocaleString('en-IN')}
                        </strong>

                      </div>


                      {/* ACTIONS */}

                      <div className="ai-doctor-actions">

                        <button
                          type="button"
                          className="ai-free-chat-button"
                          onClick={() =>
                            startFreeChat(doctor)
                          }
                          disabled={isStarting}
                        >

                          {isStarting ? (
                            <>
                              <span className="ai-loading-spinner" />
                              Starting...
                            </>
                          ) : (
                            'Start free chat'
                          )}

                        </button>


                        <button
                          type="button"
                          className="ai-book-button"
                          onClick={() =>
                            onBook?.(doctor)
                          }
                          disabled={isStarting}
                        >
                          Book consultation
                        </button>

                      </div>


                      {/* FREE CHAT NOTE */}

                      <div className="ai-free-chat-note">
                        <span>10</span>
                        free messages through AI Health Assistant
                      </div>

                    </article>

                  );

                })}

              </div>

            </div>

          )}


          {/* ==================================================
              NO DOCTOR
          ================================================== */}

          {doctors.length === 0 && (

            <div className="ai-no-doctor">

              <strong>
                No doctors available right now
              </strong>

              <p>
                There are currently no verified available
                doctors for this specialty. You can request
                an appointment instead.
              </p>

            </div>

          )}


          {/* ==================================================
              DISCLAIMER
          ================================================== */}

          <div className="ai-disclaimer">

            <span>
              ⓘ
            </span>

            <p>
              {result.disclaimer ||
                'This is general health navigation, not a medical diagnosis. Consult a qualified healthcare professional for medical advice.'}
            </p>

          </div>

        </section>

      )}

    </div>
  );
}