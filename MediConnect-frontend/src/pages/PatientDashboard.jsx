import React, {
  useEffect,
  useState,
} from 'react';

import api from '../api';

import Settings from './Settings';
import PatientProfile from './PatientProfile';
import DoctorProfile from './DoctorProfile';

import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import PageHeader from '../components/PageHeader';
import ConsultationCard from '../components/ConsultationCard';

import DoctorDiscovery from './DoctorDiscovery';
import AIHealthAssistant from './AIHealthAssistant';
import Appointments from './Appointments';
import Documents from './Documents';
import MyConsultations from './MyConsultations';
import Booking from './Booking';

export default function PatientDashboard({
  user,
  onLogout,
  page,
  setPage,
  onNotifications,
  selected,
}) {
  const [
    consultations,
    setConsultations,
  ] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadConsultations =
      async () => {
        try {
          const response =
            await api.get(
              '/consultations/my'
            );

          if (!cancelled) {
            setConsultations(
              Array.isArray(
                response.data
              )
                ? response.data
                : []
            );
          }
        } catch {
          if (!cancelled) {
            setConsultations([]);
          }
        }
      };

    loadConsultations();

    return () => {
      cancelled = true;
    };
  }, [page]);

  /*
   * --------------------------------------------------
   * FIND A DOCTOR
   * --------------------------------------------------
   */

  if (page === 'doctors') {
    return (
      <DoctorDiscovery
        onBack={() =>
          setPage('dashboard')
        }

        onViewProfile={(doctor) =>
          setPage(
            'doctor-profile',
            doctor
          )
        }

        onBook={(doctor) =>
          setPage(
            'booking',
            {
              doctor,
              service: null,
            }
          )
        }
      />
    );
  }

  /*
   * --------------------------------------------------
   * DOCTOR PROFILE
   * --------------------------------------------------
   */

  if (
    page === 'doctor-profile'
  ) {
    return (
      <Shell
        user={user}
        onLogout={onLogout}
        page={page}
        setPage={setPage}
        onNotifications={
          onNotifications
        }
      >

        <DoctorProfile
          doctor={selected}

          onBack={() =>
            setPage('doctors')
          }

          onBook={(doctor) =>
            setPage(
              'booking',
              {
                doctor,
                service: null,
              }
            )
          }
        />

      </Shell>
    );
  }

  /*
   * --------------------------------------------------
   * BOOKING
   * --------------------------------------------------
   */

  if (page === 'booking') {

    const bookingData =
      selected || {};

    return (
      <Shell
        user={user}
        onLogout={onLogout}
        page={page}
        setPage={setPage}
        onNotifications={
          onNotifications
        }
      >

        <Booking

          doctor={
            bookingData.doctor ||
            null
          }

          service={
            bookingData.service ||
            null
          }

          onBack={() => {

            if (
              bookingData.doctor
            ) {
              setPage(
                'doctor-profile',
                bookingData.doctor
              );
            } else {
              setPage('doctors');
            }

          }}

          onDone={() =>
            setPage(
              'consultations'
            )
          }

        />

      </Shell>
    );
  }

  /*
   * --------------------------------------------------
   * SETTINGS
   * --------------------------------------------------
   */

  if (page === 'settings') {
    return (
      <Shell
        user={user}
        onLogout={onLogout}
        page={page}
        setPage={setPage}
        onNotifications={
          onNotifications
        }
      >

        <Settings
          user={user}
          onBack={() =>
            setPage(
              'dashboard'
            )
          }
          onLogout={onLogout}
        />

      </Shell>
    );
  }

  /*
   * --------------------------------------------------
   * PATIENT PROFILE
   * --------------------------------------------------
   */

  if (page === 'profile') {
    return (
      <Shell
        user={user}
        onLogout={onLogout}
        page={page}
        setPage={setPage}
        onNotifications={
          onNotifications
        }
      >

        <PatientProfile
          user={user}
          onBack={() =>
            setPage(
              'dashboard'
            )
          }
          onSettings={() =>
            setPage(
              'settings'
            )
          }
        />

      </Shell>
    );
  }

  /*
   * --------------------------------------------------
   * AI HEALTH ASSISTANT
   * --------------------------------------------------
   */

  if (page === 'ai') {
    return (
      <Shell
        user={user}
        onLogout={onLogout}
        page={page}
        setPage={setPage}
        onNotifications={
          onNotifications
        }
      >

        <AIHealthAssistant
          onBook={(doctor) =>
            setPage(
              'booking',
              {
                doctor,
                service: null,
              }
            )
          }
          onOpenConsultation = {(consultation) =>
            setPage('room', consultation)
          }
        />

      </Shell>
    );
  }

  /*
   * --------------------------------------------------
   * APPOINTMENTS
   * --------------------------------------------------
   */

  if (
    page === 'appointments'
  ) {
    return (
      <Shell
        user={user}
        onLogout={onLogout}
        page={page}
        setPage={setPage}
        onNotifications={
          onNotifications
        }
      >

        <Appointments
          onOpen={(consultation) =>
            setPage(
              'room',
              consultation
            )
          }
        />

      </Shell>
    );
  }

  /*
   * --------------------------------------------------
   * DOCUMENTS
   * --------------------------------------------------
   */

  if (page === 'documents') {
    return (
      <Shell
        user={user}
        onLogout={onLogout}
        page={page}
        setPage={setPage}
        onNotifications={
          onNotifications
        }
      >

        <Documents
          consultations={
            consultations
          }
        />

      </Shell>
    );
  }

  /*
   * --------------------------------------------------
   * CONSULTATIONS
   * --------------------------------------------------
   */

  if (
    page === 'consultations'
  ) {
    return (
      <Shell
        user={user}
        onLogout={onLogout}
        page={page}
        setPage={setPage}
        onNotifications={
          onNotifications
        }
      >

        <MyConsultations
          consultations={
            consultations
          }

          onOpen={(consultation) =>
            setPage(
              'room',
              consultation
            )
          }
        />

      </Shell>
    );
  }

  /*
   * --------------------------------------------------
   * PATIENT DASHBOARD
   * --------------------------------------------------
   */

  return (
    <Shell
      user={user}
      onLogout={onLogout}
      page={page}
      setPage={setPage}
      onNotifications={
        onNotifications
      }
    >

      <PageHeader
        eyebrow="PATIENT WORKSPACE"
        title={`Good to see you, ${
          user?.name?.split(' ')[0] ||
          'there'
        }.`}
        description="Start with your health concern, then choose the care that fits you."
      />

      <section
        className="ai-hero-card"
        onClick={() =>
          setPage('ai')
        }
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {

          if (
            event.key ===
              'Enter' ||
            event.key === ' '
          ) {
            event.preventDefault();
            setPage('ai');
          }

        }}
      >

        <div className="ai-spark">
          ✦
        </div>

        <div>

          <span className="eyebrow">
            RECOMMENDED FIRST STEP
          </span>

          <h2>
            AI Health Assistant
          </h2>

          <p>
            Describe what you're
            experiencing and get general
            guidance on the right specialty
            and next step.
          </p>

          <button
            type="button"
            className="primary-btn"
            onClick={(event) => {

              event.stopPropagation();

              setPage('ai');

            }}
          >
            Start assessment →
          </button>

        </div>

        <div
          className="ai-graphic"
          aria-hidden="true"
        >
          <span>AI</span>
          <i>+</i>
          <i>•</i>
          <i>+</i>
        </div>

      </section>

      <div className="quick-grid">

        <button
          type="button"
          onClick={() =>
            setPage('doctors')
          }
        >
          <span>01</span>

          <b>
            Find a Doctor
          </b>

          <small>
            Browse verified professionals
          </small>

          →
        </button>

        <button
          type="button"
          onClick={() =>
            setPage(
              'appointments'
            )
          }
        >
          <span>02</span>

          <b>
            Appointments
          </b>

          <small>
            Requests and scheduled care
          </small>

          →
        </button>

        <button
          type="button"
          onClick={() =>
            setPage(
              'consultations'
            )
          }
        >
          <span>03</span>

          <b>
            My Consultations
          </b>

          <small>
            Continue your conversations
          </small>

          →
        </button>

        <button
          type="button"
          onClick={() =>
            setPage(
              'documents'
            )
          }
        >
          <span>04</span>

          <b>
            Medical Documents
          </b>

          <small>
            Reports and shared files
          </small>

          →
        </button>

      </div>

      <div className="section-title">

        <h2>
          Recent consultations
        </h2>

        <button
          type="button"
          className="text-btn"
          onClick={() =>
            setPage(
              'consultations'
            )
          }
        >
          View all
        </button>

      </div>

      {consultations.length >
      0 ? (

        <div className="stack">

          {consultations
            .slice(0, 3)
            .map(
              (consultation) => (

                <ConsultationCard
                  key={
                    consultation.id
                  }

                  item={
                    consultation
                  }

                  onOpen={(
                    item
                  ) =>
                    setPage(
                      'room',
                      item
                    )
                  }
                />

              )
            )}

        </div>

      ) : (

        <div className="empty-card">

          <div>✦</div>

          <h3>
            Your care history will
            appear here
          </h3>

          <p>
            Start with the AI Health
            Assistant or find a doctor.
          </p>

        </div>

      )}

    </Shell>
  );
}


/*
 * --------------------------------------------------
 * SHARED PATIENT SHELL
 * --------------------------------------------------
 */

function Shell({
  children,
  user,
  onLogout,
  page,
  setPage,
  onNotifications,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-shell">

      <Sidebar
        role="PATIENT"
        page={page}
        setPage={setPage}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onLogout={onLogout}
      />

      <div className="main-area">

        <Topbar
          user={user}
          onLogout={onLogout}
          onNotifications={
            onNotifications
          }
          onMenuToggle={() => setMobileMenuOpen((open) => !open)}
          mobileMenuOpen={mobileMenuOpen}
          onProfile={() =>
            setPage('profile')
          }
        />

        <main className="content">
          {children}
        </main>

      </div>

    </div>
  );
}