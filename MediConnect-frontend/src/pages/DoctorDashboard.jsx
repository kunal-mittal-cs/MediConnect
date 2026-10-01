import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import api from '../api';
import { money } from '../utils';

import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import StatCard from '../components/StatCard';
import ConsultationCard from '../components/ConsultationCard';

import DoctorManagement from './DoctorManagement';
import DoctorRequests from './DoctorRequests';
import DoctorProfile from './DoctorProfile';
import Settings from './Settings';

export default function DoctorDashboard({
  user,
  onLogout,
  page,
  setPage,
  onNotifications,
}) {
  const [consultations, setConsultations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [earnings, setEarnings] =
    useState({
      gross_amount: 0,
      platform_fee: 0,
      doctor_earnings: 0,
      paid_consultations: 0,
      platform_fee_rule:
        'Current platform fee settings',
    });

  const [earningsPeriod, setEarningsPeriod] =
    useState('month');

  const [earningsLoading, setEarningsLoading] =
    useState(true);

  /*
   * PUBLIC DOCTOR PROFILE
   */
  const [publicDoctor, setPublicDoctor] =
    useState(null);

  const [publicProfileLoading, setPublicProfileLoading] =
    useState(false);

  const [publicProfileError, setPublicProfileError] =
    useState('');


  /*
   * ========================================================
   * LOAD CONSULTATIONS
   * ========================================================
   */
  const load = async () => {
    setLoading(true);

    try {
      const response = await api.get(
        '/consultations/doctor'
      );

      setConsultations(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch {
      setConsultations([]);
    } finally {
      setLoading(false);
    }
  };


  /*
   * ========================================================
   * LOAD EARNINGS
   * ========================================================
   */
  const loadEarnings = async (
    selectedPeriod = earningsPeriod
  ) => {
    setEarningsLoading(true);

    try {
      const response = await api.get(
        `/consultations/doctor/earnings?period=${selectedPeriod}`
      );

      setEarnings(
        response.data || {
          gross_amount: 0,
          platform_fee: 0,
          doctor_earnings: 0,
          paid_consultations: 0,
          platform_fee_rule:
            'Current platform fee settings',
        }
      );
    } catch {
      setEarnings({
        gross_amount: 0,
        platform_fee: 0,
        doctor_earnings: 0,
        paid_consultations: 0,
        platform_fee_rule:
          'Current platform fee settings',
      });
    } finally {
      setEarningsLoading(false);
    }
  };


  /*
   * ========================================================
   * LOAD CURRENT DOCTOR PROFILE
   * ========================================================
   *
   * This endpoint is authenticated and returns
   * the profile belonging to the currently
   * logged-in doctor.
   *
   * We use this for:
   *
   * 1. Dashboard greeting
   * 2. Topbar → Profile
   * 3. Public doctor profile
   *
   * This avoids using /doctors/discover,
   * which is intended for finding doctors.
   */
  const loadPublicDoctorProfile = async () => {
    setPublicProfileLoading(true);
    setPublicProfileError('');

    try {
      const response = await api.get(
        '/doctors/profile'
      );

      const doctor =
        response.data || null;

      if (!doctor) {
        setPublicDoctor(null);

        setPublicProfileError(
          'Your doctor profile could not be found.'
        );

        return false;
      }

      setPublicDoctor(doctor);

      return true;
    } catch (error) {
      console.error(
        'Could not load current doctor profile:',
        error
      );

      setPublicDoctor(null);

      setPublicProfileError(
        error.response?.data?.detail ||
          'Unable to load your doctor profile right now.'
      );

      return false;
    } finally {
      setPublicProfileLoading(false);
    }
  };


  /*
   * ========================================================
   * OPEN PUBLIC PROFILE
   * ========================================================
   *
   * Topbar → Profile
   */
  const openPublicProfile = async () => {
    const loaded =
      await loadPublicDoctorProfile();

    if (loaded) {
      setPage('doctor-profile');
    }
  };


  /*
   * ========================================================
   * LOAD DASHBOARD DATA
   * ========================================================
   */
  useEffect(() => {
    load();
  }, [page]);


  /*
   * ========================================================
   * LOAD CURRENT DOCTOR PROFILE ON DASHBOARD LOAD
   * ========================================================
   *
   * This is important because the dashboard greeting
   * needs the doctor's actual profile name even before
   * the user clicks Topbar → Profile.
   */
  useEffect(() => {
    loadPublicDoctorProfile();
  }, []);


  useEffect(() => {
    loadEarnings(earningsPeriod);
  }, [page]);


  useEffect(() => {
    loadEarnings(earningsPeriod);
  }, [earningsPeriod]);


  /*
   * ========================================================
   * CONSULTATION COUNTS
   * ========================================================
   */
  const ongoingCount =
    consultations.filter(
      (item) =>
        String(item.status || '')
          .toUpperCase() === 'ONGOING'
    ).length;


  const completedCount =
    consultations.filter(
      (item) =>
        String(item.status || '')
          .toUpperCase() === 'COMPLETED'
    ).length;


  const confirmedCount =
    consultations.filter(
      (item) =>
        String(item.status || '')
          .toUpperCase() === 'CONFIRMED'
    ).length;


  /*
   * ========================================================
   * UPCOMING CONSULTATIONS
   * ========================================================
   */
  const upcoming =
    useMemo(() => {
      const now = new Date();

      return consultations
        .filter((item) => {
          if (!item.scheduled_at) {
            return false;
          }

          const date = new Date(
            item.scheduled_at
          );

          return (
            !Number.isNaN(
              date.getTime()
            ) &&
            date >= now &&
            ['CONFIRMED', 'PENDING'].includes(
              String(
                item.status || ''
              ).toUpperCase()
            )
          );
        })
        .sort(
          (a, b) =>
            new Date(a.scheduled_at) -
            new Date(b.scheduled_at)
        );
    }, [consultations]);


  /*
   * ========================================================
   * PUBLIC DOCTOR PROFILE
   * ========================================================
   *
   * This is the same DoctorProfile component
   * that patients see from:
   *
   * Find a Doctor → View Profile
   */
  if (page === 'doctor-profile') {
    return (
      <Shell
        {...{
          user,
          onLogout,
          page,
          setPage,
          onNotifications,
          onProfile: openPublicProfile,
        }}
      >

        {publicProfileLoading ? (
          <div className="loading-card">
            Loading your public profile...
          </div>
        ) : publicDoctor ? (
          <DoctorProfile
            doctor={publicDoctor}

            onBack={() =>
              setPage('dashboard')
            }

            ownProfile={true}
          />
        ) : (
          <div className="empty-card">

            <h3>
              Profile unavailable
            </h3>

            <p>
              {publicProfileError ||
                'Your public doctor profile could not be loaded.'}
            </p>

            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                setPage('dashboard')
              }
            >
              ← Back to Dashboard
            </button>

          </div>
        )}

      </Shell>
    );
  }


  /*
   * ========================================================
   * SETTINGS
   * ========================================================
   */
  if (page === 'settings') {
    return (
      <Shell
        {...{
          user,
          onLogout,
          page,
          setPage,
          onNotifications,
          onProfile: openPublicProfile,
        }}
      >
        <Settings
          user={user}
          onBack={() =>
            setPage('dashboard')
          }
          onLogout={onLogout}
        />
      </Shell>
    );
  }


  /*
   * ========================================================
   * MANAGE PROFILE
   * ========================================================
   *
   * This remains the EDITABLE doctor profile.
   */
  if (page === 'management') {
    return (
      <Shell
        {...{
          user,
          onLogout,
          page,
          setPage,
          onNotifications,
          onProfile: openPublicProfile,
        }}
      >
        <DoctorManagement
          mode="profile"
        />
      </Shell>
    );
  }


  /*
   * ========================================================
   * AVAILABILITY
   * ========================================================
   */
  if (page === 'availability') {
    return (
      <Shell
        {...{
          user,
          onLogout,
          page,
          setPage,
          onNotifications,
          onProfile: openPublicProfile,
        }}
      >
        <DoctorManagement
          mode="availability"
        />
      </Shell>
    );
  }


  /*
   * ========================================================
   * CONSULTATIONS
   * ========================================================
   */
  if (page === 'consultations') {
    return (
      <Shell
        {...{
          user,
          onLogout,
          page,
          setPage,
          onNotifications,
          onProfile: openPublicProfile,
        }}
      >
        <div className="page-heading">

          <span className="section-kicker">
            CARE HISTORY
          </span>

          <h1>
            My consultations
          </h1>

          <p>
            Review your patient care history
            and active consultations.
          </p>

        </div>


        {loading ? (
          <div className="loading-card">
            Loading consultations...
          </div>
        ) : consultations.length ? (
          <div className="stack">

            {consultations.map(
              (item) => (
                <ConsultationCard
                  key={item.id}
                  item={item}

                  onOpen={(consultation) =>
                    setPage(
                      'room',
                      consultation
                    )
                  }
                />
              )
            )}

          </div>
        ) : (
          <div className="empty-card">

            <h3>
              No consultations yet
            </h3>

            <p>
              Your patient consultations will
              appear here.
            </p>

          </div>
        )}

      </Shell>
    );
  }


  /*
   * ========================================================
   * APPOINTMENT REQUESTS
   * ========================================================
   */
  if (page === 'appointments') {
    return (
      <Shell
        {...{
          user,
          onLogout,
          page,
          setPage,
          onNotifications,
          onProfile: openPublicProfile,
        }}
      >
        <DoctorRequests />
      </Shell>
    );
  }


  /*
   * ========================================================
   * CALENDAR
   * ========================================================
   */
  if (page === 'calendar') {
    return (
      <Shell
        {...{
          user,
          onLogout,
          page,
          setPage,
          onNotifications,
          onProfile: openPublicProfile,
        }}
      >
        <DoctorCalendar
          consultations={consultations}
          loading={loading}
          onOpen={(item) =>
            setPage('room', item)
          }
        />
      </Shell>
    );
  }


  /*
   * ========================================================
   * MAIN DASHBOARD
   * ========================================================
   */
  return (
    <Shell
      {...{
        user,
        onLogout,
        page,
        setPage,
        onNotifications,
        onProfile: openPublicProfile,
      }}
    >

      <div className="doctor-dashboard">

        {/* =================================================
            DASHBOARD INTRO
            ================================================= */}

        <section className="dashboard-intro">

          <div>

            <span className="section-kicker">
              DOCTOR WORKSPACE
            </span>

            <h1>
              Welcome,{' '}
              {publicDoctor?.name ||
                user?.name ||
                'Doctor'}
              .
            </h1>

            <p>
              A focused overview of your
              consultations and practice.
            </p>

          </div>


          <button
            type="button"
            className="primary-btn"
            onClick={() =>
              setPage('availability')
            }
          >
            Manage availability
          </button>

        </section>


        {/* =================================================
            STATS
            ================================================= */}

        <div className="stats-grid">

          <StatCard
            label="Consultations"
            value={consultations.length}
            meta="Total assigned care"
            icon="◌"
          />

          <StatCard
            label="Upcoming"
            value={confirmedCount}
            meta="Confirmed appointments"
            icon="◷"
          />

          <StatCard
            label="Active"
            value={ongoingCount}
            meta="Currently ongoing"
            icon="◉"
          />

          <StatCard
            label="Completed"
            value={completedCount}
            meta="Care history"
            icon="✓"
          />

        </div>


        {/* =================================================
            EARNINGS
            ================================================= */}

        <section className="dashboard-section earnings-section">

          <div className="section-heading-row">

            <div>

              <span className="section-kicker">
                EARNINGS
              </span>

              <h2>
                Your earnings
              </h2>

              <p>
                Track your earnings after the
                MediConnect platform fee.
              </p>

            </div>


            <div className="earnings-filter">

              <button
                type="button"
                className={
                  earningsPeriod === 'day'
                    ? 'earnings-filter-btn active'
                    : 'earnings-filter-btn'
                }
                onClick={() =>
                  setEarningsPeriod('day')
                }
              >
                Today
              </button>

              <button
                type="button"
                className={
                  earningsPeriod === 'month'
                    ? 'earnings-filter-btn active'
                    : 'earnings-filter-btn'
                }
                onClick={() =>
                  setEarningsPeriod('month')
                }
              >
                This Month
              </button>

              <button
                type="button"
                className={
                  earningsPeriod === 'all'
                    ? 'earnings-filter-btn active'
                    : 'earnings-filter-btn'
                }
                onClick={() =>
                  setEarningsPeriod('all')
                }
              >
                All Time
              </button>

            </div>

          </div>


          <div className="earnings-card">

            {/* NET EARNINGS */}

            <div className="earnings-main">

              <span className="earnings-label">
                Net earnings
              </span>

              <strong className="earnings-amount">

                {earningsLoading
                  ? '—'
                  : money(
                      earnings.doctor_earnings
                    )}

              </strong>

              <span className="earnings-caption">
                After platform fee
              </span>

            </div>


            {/* BREAKDOWN */}

            <div className="earnings-breakdown">

              <div className="earnings-row">

                <span>
                  Gross consultation revenue
                </span>

                <strong>
                  {money(
                    earnings.gross_amount
                  )}
                </strong>

              </div>


              <div className="earnings-row fee">

                <span>
                  MediConnect platform fee
                </span>

                <strong>
                  −{money(
                    earnings.platform_fee
                  )}
                </strong>

              </div>


              <div className="earnings-divider" />


              <div className="earnings-row total">

                <span>
                  Your earnings
                </span>

                <strong>
                  {money(
                    earnings.doctor_earnings
                  )}
                </strong>

              </div>

            </div>


            {/* FOOTER */}

            <div className="earnings-footer">

              <span>
                Paid consultations
              </span>

              <strong>

                {earningsLoading
                  ? '—'
                  : earnings.paid_consultations}

              </strong>

              <span className="earnings-rule">

                {earnings.platform_fee_rule ||
                  'Current platform fee settings'}

              </span>

            </div>

          </div>

        </section>


        {/* =================================================
            UPCOMING CARE
            ================================================= */}

        <section className="dashboard-section">

          <div className="section-heading-row">

            <div>

              <span className="section-kicker">
                SCHEDULE
              </span>

              <h2>
                Upcoming care
              </h2>

              <p>
                Your next patient
                consultations.
              </p>

            </div>


            <button
              type="button"
              className="text-btn"
              onClick={() =>
                setPage('calendar')
              }
            >
              View calendar →
            </button>

          </div>


          {loading ? (

            <div className="loading-card">
              Loading...
            </div>

          ) : upcoming.length ? (

            <div className="consultation-list">

              {upcoming
                .slice(0, 4)
                .map((item) => (

                  <ConsultationCard
                    key={item.id}
                    item={item}

                    onOpen={(consultation) =>
                      setPage(
                        'room',
                        consultation
                      )
                    }
                  />

                ))}

            </div>

          ) : (

            <div className="empty-card compact">

              <h3>
                No upcoming consultations
              </h3>

              <p>
                Your confirmed bookings will
                appear here.
              </p>

            </div>

          )}

        </section>


        {/* =================================================
            QUICK ACTIONS
            ================================================= */}

        <section className="dashboard-section">

          <div className="section-heading-row">

            <div>

              <span className="section-kicker">
                WORKSPACE
              </span>

              <h2>
                Quick actions
              </h2>

              <p>
                Access the parts of your
                practice you use most.
              </p>

            </div>

          </div>


          <div className="doctor-actions-grid">

            {/* 01 — MANAGE PROFILE */}

            <button
              type="button"
              onClick={() =>
                setPage('management')
              }
            >
              <span>
                01
              </span>

              <div>

                <strong>
                  Manage Profile
                </strong>

                <small>
                  Edit details and services
                </small>

              </div>

              <b>
                →
              </b>

            </button>


            {/* 02 — AVAILABILITY */}

            <button
              type="button"
              onClick={() =>
                setPage('availability')
              }
            >
              <span>
                02
              </span>

              <div>

                <strong>
                  Availability
                </strong>

                <small>
                  Manage your bookable hours
                </small>

              </div>

              <b>
                →
              </b>

            </button>


            {/* 03 — CONSULTATIONS */}

            <button
              type="button"
              onClick={() =>
                setPage('consultations')
              }
            >
              <span>
                03
              </span>

              <div>

                <strong>
                  Consultations
                </strong>

                <small>
                  Open patient care history
                </small>

              </div>

              <b>
                →
              </b>

            </button>

          </div>

        </section>

      </div>

    </Shell>
  );
}


/* =========================================================
   DOCTOR CALENDAR
   ========================================================= */

function DoctorCalendar({
  consultations,
  loading,
  onOpen,
}) {
  const [date, setDate] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10)
    );


  const items = useMemo(
    () =>
      consultations
        .filter((item) => {
          if (!item.scheduled_at) {
            return false;
          }

          return (
            new Date(
              item.scheduled_at
            )
              .toISOString()
              .slice(0, 10) === date
          );
        })
        .sort(
          (a, b) =>
            new Date(a.scheduled_at) -
            new Date(b.scheduled_at)
        ),
    [consultations, date]
  );


  return (
    <div>

      <div className="page-heading">

        <span className="section-kicker">
          CALENDAR
        </span>

        <h1>
          Consultation calendar
        </h1>

        <p>
          Review your scheduled patient
          consultations by date.
        </p>

      </div>


      <section className="calendar-control">

        <label>

          Select date

          <input
            type="date"
            value={date}
            onChange={(event) =>
              setDate(event.target.value)
            }
          />

        </label>

      </section>


      {loading ? (

        <div className="loading-card">
          Loading...
        </div>

      ) : items.length ? (

        <div className="calendar-list">

          {items.map((item) => (

            <div
              className="calendar-event"
              key={item.id}
            >

              <div className="calendar-event-time">

                <strong>
                  {new Date(
                    item.scheduled_at
                  ).toLocaleTimeString(
                    'en-IN',
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </strong>

                {item.ends_at && (
                  <span>
                    {new Date(
                      item.ends_at
                    ).toLocaleTimeString(
                      'en-IN',
                      {
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}
                  </span>
                )}

              </div>


              <div className="calendar-event-main">

                <strong>
                  {item.service_title ||
                    'Consultation'}
                </strong>

                <span>
                  Patient consultation
                </span>

                <small>
                  {String(
                    item.status || ''
                  ).toUpperCase()}
                </small>

              </div>


              <button
                type="button"
                className="secondary-btn small"
                onClick={() =>
                  onOpen(item)
                }
              >
                Open
              </button>

            </div>

          ))}

        </div>

      ) : (

        <div className="empty-card">

          <h3>
            No consultations scheduled
          </h3>

          <p>
            No patient consultations are
            scheduled for this date.
          </p>

        </div>

      )}

    </div>
  );
}


/* =========================================================
   SHELL
   ========================================================= */

function Shell({
  children,
  user,
  onLogout,
  page,
  setPage,
  onNotifications,
  onProfile,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  return (
    <div className="app-shell">

      <Sidebar
        role="DOCTOR"
        page={page}
        setPage={setPage}
        mobileOpen={mobileMenuOpen}
        onClose={() =>
          setMobileMenuOpen(false)
        }
        onLogout={onLogout}
      />

      <div className="main-area">

        <Topbar
          user={user}
          onLogout={onLogout}
          onNotifications={onNotifications}

          onMenuToggle={() =>
            setMobileMenuOpen(
              (open) => !open
            )
          }

          mobileMenuOpen={
            mobileMenuOpen
          }

          onProfile={
            onProfile
          }
        />

        <main className="content">
          {children}
        </main>

      </div>

    </div>
  );
}