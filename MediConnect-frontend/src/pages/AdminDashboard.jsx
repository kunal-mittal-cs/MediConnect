import React, {
  useEffect,
  useState,
} from 'react';

import api from '../api';

import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';

import Settings from './Settings';
import AdminProfile from './AdminProfile';

import {
  money,
  dateTime,
  toast,
} from '../utils';


export default function AdminDashboard({
  user,
  onLogout,
  page,
  setPage,
  onNotifications,
  unread = 0,
}) {
  const [dashboard, setDashboard] =
    useState(null);

  const [requests, setRequests] =
    useState([]);

  const [doctors, setDoctors] =
    useState([]);

  const [patients, setPatients] =
    useState([]);

  const [consultations, setConsultations] =
    useState([]);

  const [payments, setPayments] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [actingId, setActingId] =
    useState(null);

  const [paymentPeriod, setPaymentPeriod] =
    useState('month');

  const [doctorFilter, setDoctorFilter] =
    useState('all');

  const [patientFilter, setPatientFilter] =
    useState('all');

  const [consultationFilter, setConsultationFilter] =
    useState('all');


  // =====================================================
  // LOADERS
  // =====================================================

  const loadDashboard = async () => {
    try {
      const response =
        await api.get('/admin/dashboard');

      setDashboard(
        response.data
      );
    } catch (error) {
      toast(
        error.response?.data?.detail ||
          'Could not load dashboard',
        'error'
      );
    }
  };


  const loadRequests = async () => {
    try {
      const response =
        await api.get(
          '/appointment-requests/pending'
        );

      setRequests(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch {
      setRequests([]);
    }
  };


  const loadDoctors = async () => {
    try {
      const endpoint =
        doctorFilter === 'all'
          ? '/admin/doctors'
          : `/admin/doctors?status=${doctorFilter}`;

      const response =
        await api.get(endpoint);

      setDoctors(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (error) {
      setDoctors([]);

      toast(
        error.response?.data?.detail ||
          'Could not load doctors',
        'error'
      );
    }
  };


  const loadPatients = async () => {
    try {
      const endpoint =
        patientFilter === 'all'
          ? '/admin/patients'
          : `/admin/patients?status=${patientFilter}`;

      const response =
        await api.get(endpoint);

      setPatients(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (error) {
      setPatients([]);

      toast(
        error.response?.data?.detail ||
          'Could not load patients',
        'error'
      );
    }
  };


  const loadConsultations =
    async () => {
      try {
        const endpoint =
          consultationFilter === 'all'
            ? '/admin/consultations'
            : `/admin/consultations?status=${consultationFilter}`;

        const response =
          await api.get(endpoint);

        setConsultations(
          Array.isArray(
            response.data
          )
            ? response.data
            : []
        );
      } catch (error) {
        setConsultations([]);

        toast(
          error.response?.data?.detail ||
            'Could not load consultations',
          'error'
        );
      }
    };


  const loadPayments = async () => {
    try {
      const response =
        await api.get(
          `/admin/payments?period=${paymentPeriod}`
        );

      setPayments(
        response.data
      );
    } catch (error) {
      setPayments(null);

      toast(
        error.response?.data?.detail ||
          'Could not load payments',
        'error'
      );
    }
  };


  const loadAll = async () => {
    setLoading(true);

    await Promise.allSettled([
      loadDashboard(),
      loadRequests(),
      loadDoctors(),
      loadPatients(),
      loadConsultations(),
      loadPayments(),
    ]);

    setLoading(false);
  };


  useEffect(() => {
    loadAll();
  }, []);


  useEffect(() => {
    if (!loading) {
      loadDoctors();
    }
  }, [doctorFilter]);


  useEffect(() => {
    if (!loading) {
      loadPatients();
    }
  }, [patientFilter]);


  useEffect(() => {
    if (!loading) {
      loadConsultations();
    }
  }, [consultationFilter]);


  useEffect(() => {
    if (!loading) {
      loadPayments();
    }
  }, [paymentPeriod]);


  // =====================================================
  // DOCTOR ACTIONS
  // =====================================================

  const verifyDoctor =
    async (doctorId) => {
      if (
        !doctorId ||
        actingId !== null
      ) {
        return;
      }

      setActingId(doctorId);

      try {
        await api.put(
          `/admin/doctors/${doctorId}/verify`
        );

        toast(
          'Doctor verified successfully'
        );

        await Promise.all([
          loadDashboard(),
          loadDoctors(),
        ]);
      } catch (error) {
        toast(
          error.response?.data?.detail ||
            'Doctor verification failed',
          'error'
        );
      } finally {
        setActingId(null);
      }
    };


  const rejectDoctor =
    async (doctorId) => {
      if (
        !doctorId ||
        actingId !== null
      ) {
        return;
      }

      setActingId(doctorId);

      try {
        await api.put(
          `/admin/doctors/${doctorId}/reject`
        );

        toast(
          'Doctor application rejected'
        );

        await Promise.all([
          loadDashboard(),
          loadDoctors(),
        ]);
      } catch (error) {
        toast(
          error.response?.data?.detail ||
            'Could not reject doctor',
          'error'
        );
      } finally {
        setActingId(null);
      }
    };


  const toggleDoctor =
    async (
      doctorId,
      active
    ) => {
      if (
        !doctorId ||
        actingId !== null
      ) {
        return;
      }

      setActingId(doctorId);

      try {
        await api.put(
          `/admin/doctors/${doctorId}/status?active=${active}`
        );

        toast(
          active
            ? 'Doctor activated'
            : 'Doctor deactivated'
        );

        await loadDoctors();
      } catch (error) {
        toast(
          error.response?.data?.detail ||
            'Could not update doctor',
          'error'
        );
      } finally {
        setActingId(null);
      }
    };


  // =====================================================
  // PATIENT ACTION
  // =====================================================

  const togglePatient =
    async (
      patientId,
      active
    ) => {
      if (
        !patientId ||
        actingId !== null
      ) {
        return;
      }

      setActingId(patientId);

      try {
        await api.put(
          `/admin/patients/${patientId}/status?active=${active}`
        );

        toast(
          active
            ? 'Patient activated'
            : 'Patient deactivated'
        );

        await Promise.all([
          loadDashboard(),
          loadPatients(),
        ]);
      } catch (error) {
        toast(
          error.response?.data?.detail ||
            'Could not update patient',
          'error'
        );
      } finally {
        setActingId(null);
      }
    };


  // =====================================================
  // APPOINTMENT ASSIGNMENT
  // =====================================================

  const assignRequest =
    async (
      requestId,
      doctorId
    ) => {
      if (
        !requestId ||
        !doctorId ||
        actingId !== null
      ) {
        return;
      }

      setActingId(requestId);

      try {
        await api.put(
          `/appointment-requests/${requestId}/assign/${doctorId}`
        );

        toast(
          'Appointment request assigned'
        );

        await Promise.all([
          loadRequests(),
          loadDashboard(),
        ]);
      } catch (error) {
        toast(
          error.response?.data?.detail ||
            'Assignment failed',
          'error'
        );
      } finally {
        setActingId(null);
      }
    };


  // =====================================================
  // REQUEST MATCHING
  // =====================================================

  const verifiedDoctors =
    doctors.filter(
      (doctor) =>
        String(
          doctor.verification_status || ''
        ).toUpperCase() === 'VERIFIED'
    );


  const getMatchingDoctors =
    (specialization) => {
      const requested =
        String(
          specialization || ''
        )
          .trim()
          .toLowerCase();

      if (!requested) {
        return verifiedDoctors;
      }

      return verifiedDoctors.filter(
        (doctor) => {
          const doctorSpecialization =
            String(
              doctor.specialization || ''
            )
              .trim()
              .toLowerCase();

          return (
            doctorSpecialization.includes(
              requested
            ) ||
            requested.includes(
              doctorSpecialization
            )
          );
        }
      );
    };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <Shell
        user={user}
        onLogout={onLogout}
        page={page}
        setPage={setPage}
        onNotifications={
          onNotifications
        }
        unread={unread}
      >
        <PageHeader
          eyebrow="ADMIN WORKSPACE"
          title="Platform overview"
          description="Monitor patients, doctors, consultations and platform revenue."
        />

        <div className="loading-card">
          Loading admin workspace…
        </div>
      </Shell>
    );
  }


  // =====================================================
  // ADMIN PROFILE
  // =====================================================

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
        unread={unread}
      >
        <AdminProfile
          user={user}
          onBack={() =>
            setPage('overview')
          }
          onSettings={() =>
            setPage('settings')
          }
        />
      </Shell>
    );
  }


  // =====================================================
  // APPOINTMENT REQUESTS
  // =====================================================

  if (page === 'requests') {
    return (
      <Shell
        user={user}
        onLogout={onLogout}
        page={page}
        setPage={setPage}
        onNotifications={
          onNotifications
        }
        unread={unread}
      >
        <PageHeader
          eyebrow="APPOINTMENT QUEUE"
          title="Appointment requests"
          description="Review patient requests and assign them to verified doctors."
        />

        <div className="stack">

          {requests.length > 0 ? (
            requests.map(
              (request) => {
                const matchingDoctors =
                  getMatchingDoctors(
                    request.specialization
                  );

                const isActing =
                  actingId ===
                  request.id;

                return (
                  <div
                    className="request-card"
                    key={request.id}
                  >

                    <div>

                      <span className="muted">
                        Request #
                        {request.id}
                      </span>

                      <h3>
                        {request.specialization ||
                          'Medical consultation'}
                      </h3>

                      <p>
                        {request.preferred_date ||
                          'Date not specified'}
                        {' · '}
                        {String(
                          request.preferred_time ||
                            ''
                        ).slice(
                          0,
                          5
                        )}
                      </p>

                      {request.message && (
                        <small>
                          {request.message}
                        </small>
                      )}

                    </div>


                    <div className="request-actions">

                      <select
                        defaultValue=""
                        onChange={(
                          event
                        ) => {
                          const value =
                            event.target
                              .value;

                          if (value) {
                            assignRequest(
                              request.id,
                              value
                            );
                          }
                        }}
                        disabled={
                          isActing ||
                          matchingDoctors.length ===
                            0
                        }
                      >

                        <option value="">
                          {matchingDoctors.length >
                          0
                            ? 'Assign doctor…'
                            : 'No matching doctor'}
                        </option>

                        {matchingDoctors.map(
                          (doctor) => (
                            <option
                              key={
                                doctor.id
                              }
                              value={
                                doctor.id
                              }
                            >
                              {doctor.name}
                              {' · '}
                              {
                                doctor.specialization
                              }
                            </option>
                          )
                        )}

                      </select>

                      {isActing && (
                        <small className="muted">
                          Assigning…
                        </small>
                      )}

                    </div>

                  </div>
                );
              }
            )
          ) : (
            <div className="empty-card">

              <h3>
                No pending requests
              </h3>

              <p>
                The appointment queue is clear.
              </p>

            </div>
          )}

        </div>

      </Shell>
    );
  }


  // =====================================================
  // DOCTORS
  // =====================================================

  if (page === 'doctors') {
    return (
      <Shell
        user={user}
        onLogout={onLogout}
        page={page}
        setPage={setPage}
        onNotifications={
          onNotifications
        }
        unread={unread}
      >

        <PageHeader
          eyebrow="DOCTOR MANAGEMENT"
          title="Doctors"
          description="Review verification status and manage doctor accounts."
        />


        <div className="toolbar">

          <select
            value={doctorFilter}
            onChange={(event) =>
              setDoctorFilter(
                event.target.value
              )
            }
          >

            <option value="all">
              All doctors
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="verified">
              Verified
            </option>

            <option value="rejected">
              Rejected
            </option>

          </select>

        </div>


        <div className="stack">

          {doctors.length > 0 ? (
            doctors.map(
              (doctor) => {
                const status =
                  String(
                    doctor.verification_status ||
                      'PENDING'
                  ).toUpperCase();

                const isActing =
                  actingId ===
                  doctor.id;

                return (
                  <div
                    className="request-card"
                    key={doctor.id}
                  >

                    <div>

                      <span className="muted">
                        Doctor #
                        {doctor.id}
                      </span>

                      <h3>
                        {doctor.name ||
                          'Doctor'}
                      </h3>

                      <p>
                        {doctor.specialization ||
                          'Specialization not provided'}
                        {' · '}
                        {doctor.qualification ||
                          'Qualification not provided'}
                        {' · '}
                        {Number(
                          doctor.experience
                        ) || 0}
                        + years
                      </p>

                      <small>
                        {doctor.email}
                        {' · '}
                        {doctor.is_active
                          ? 'Active'
                          : 'Inactive'}
                      </small>

                      {doctor.bio && (
                        <small>
                          {doctor.bio}
                        </small>
                      )}

                    </div>


                    <div className="request-actions">

                      <span
                        className={`status ${status.toLowerCase()}`}
                      >
                        {status}
                      </span>


                      {status !==
                        'VERIFIED' && (
                        <button
                          type="button"
                          className="primary-btn small"
                          onClick={() =>
                            verifyDoctor(
                              doctor.id
                            )
                          }
                          disabled={
                            actingId !==
                            null
                          }
                        >
                          {isActing
                            ? 'Working…'
                            : 'Verify'}
                        </button>
                      )}


                      {status ===
                        'PENDING' && (
                        <button
                          type="button"
                          className="secondary-btn small"
                          onClick={() =>
                            rejectDoctor(
                              doctor.id
                            )
                          }
                          disabled={
                            actingId !==
                            null
                          }
                        >
                          Reject
                        </button>
                      )}


                      {status ===
                        'VERIFIED' && (
                        <button
                          type="button"
                          className="secondary-btn small"
                          onClick={() =>
                            toggleDoctor(
                              doctor.id,
                              !doctor.is_active
                            )
                          }
                          disabled={
                            actingId !==
                            null
                          }
                        >
                          {doctor.is_active
                            ? 'Deactivate'
                            : 'Activate'}
                        </button>
                      )}

                    </div>

                  </div>
                );
              }
            )
          ) : (
            <div className="empty-card">

              <h3>
                No doctors found
              </h3>

              <p>
                There are no doctors matching this filter.
              </p>

            </div>
          )}

        </div>

      </Shell>
    );
  }


  // =====================================================
  // PATIENTS
  // =====================================================

  if (page === 'patients') {
    return (
      <Shell
        user={user}
        onLogout={onLogout}
        page={page}
        setPage={setPage}
        onNotifications={
          onNotifications
        }
        unread={unread}
      >

        <PageHeader
          eyebrow="PATIENT MANAGEMENT"
          title="Patients"
          description="View registered patients and manage account status."
        />


        <div className="toolbar">

          <select
            value={patientFilter}
            onChange={(event) =>
              setPatientFilter(
                event.target.value
              )
            }
          >

            <option value="all">
              All patients
            </option>

            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>

          </select>

        </div>


        <div className="stack">

          {patients.length > 0 ? (
            patients.map(
              (patient) => {
                const isActing =
                  actingId ===
                  patient.id;

                return (
                  <div
                    className="request-card"
                    key={patient.id}
                  >

                    <div>

                      <span className="muted">
                        Patient #
                        {patient.id}
                      </span>

                      <h3>
                        {patient.name}
                      </h3>

                      <p>
                        {patient.email}
                      </p>

                      <small>
                        Registered{' '}
                        {dateTime(
                          patient.created_at
                        )}
                      </small>

                    </div>


                    <div className="request-actions">

                      <span
                        className={
                          patient.is_active
                            ? 'status verified'
                            : 'status rejected'
                        }
                      >
                        {patient.is_active
                          ? 'ACTIVE'
                          : 'INACTIVE'}
                      </span>


                      <button
                        type="button"
                        className="secondary-btn small"
                        onClick={() =>
                          togglePatient(
                            patient.id,
                            !patient.is_active
                          )
                        }
                        disabled={
                          actingId !==
                          null
                        }
                      >
                        {isActing
                          ? 'Working…'
                          : patient.is_active
                            ? 'Deactivate'
                            : 'Activate'}
                      </button>

                    </div>

                  </div>
                );
              }
            )
          ) : (
            <div className="empty-card">

              <h3>
                No patients found
              </h3>

              <p>
                No patient accounts match this filter.
              </p>

            </div>
          )}

        </div>

      </Shell>
    );
  }


  // =====================================================
  // CONSULTATIONS
  // =====================================================

  if (page === 'consultations') {
    return (
      <Shell
        user={user}
        onLogout={onLogout}
        page={page}
        setPage={setPage}
        onNotifications={
          onNotifications
        }
        unread={unread}
      >

        <PageHeader
          eyebrow="CONSULTATION MONITORING"
          title="Consultations"
          description="Monitor consultation status, participants and payment state."
        />


        <div className="toolbar">

          <select
            value={consultationFilter}
            onChange={(event) =>
              setConsultationFilter(
                event.target.value
              )
            }
          >

            <option value="all">
              All consultations
            </option>

            <option value="PENDING">
              Pending
            </option>

            <option value="CONFIRMED">
              Confirmed
            </option>

            <option value="ONGOING">
              Ongoing
            </option>

            <option value="COMPLETED">
              Completed
            </option>

            <option value="CANCELLED">
              Cancelled
            </option>

          </select>

        </div>


        <div className="stack">

          {consultations.length >
          0 ? (
            consultations.map(
              (consultation) => (
                <div
                  className="request-card"
                  key={
                    consultation.id
                  }
                >

                  <div>

                    <span className="muted">
                      Consultation #
                      {
                        consultation.id
                      }
                    </span>

                    <h3>
                      {
                        consultation.service_title
                      }
                    </h3>

                    <p>
                      <strong>
                        Patient:
                      </strong>{' '}
                      {
                        consultation.patient_name
                      }
                      {' · '}
                      <strong>
                        Doctor:
                      </strong>{' '}
                      {
                        consultation.doctor_name
                      }
                    </p>

                    <p>
                      {consultation.scheduled_at
                        ? dateTime(
                            consultation.scheduled_at
                          )
                        : 'Not scheduled'}
                    </p>

                    <small>
                      Payment:{' '}
                      {
                        consultation.payment_status
                      }
                      {' · '}
                      Amount:{' '}
                      {money(
                        consultation.amount
                      )}
                    </small>

                  </div>


                  <div className="request-actions">

                    <span
                      className={`status ${String(
                        consultation.status ||
                          ''
                      ).toLowerCase()}`}
                    >
                      {
                        consultation.status
                      }
                    </span>

                    <small>
                      Fee:{' '}
                      {money(
                        consultation.platform_fee
                      )}
                    </small>

                  </div>

                </div>
              )
            )
          ) : (
            <div className="empty-card">

              <h3>
                No consultations
              </h3>

              <p>
                No consultations match this filter.
              </p>

            </div>
          )}

        </div>

      </Shell>
    );
  }


  // =====================================================
  // PAYMENTS
  // =====================================================

  if (page === 'payments') {
    return (
      <Shell
        user={user}
        onLogout={onLogout}
        page={page}
        setPage={setPage}
        onNotifications={
          onNotifications
        }
        unread={unread}
      >

        <PageHeader
          eyebrow="FINANCE"
          title="Payments & earnings"
          description="Track paid bookings, platform fees and doctor payouts."
        />


        <div className="earnings-filter">

          <button
            type="button"
            className={
              paymentPeriod === 'day'
                ? 'filter-btn active'
                : 'filter-btn'
            }
            onClick={() =>
              setPaymentPeriod(
                'day'
              )
            }
          >
            Today
          </button>


          <button
            type="button"
            className={
              paymentPeriod ===
              'month'
                ? 'filter-btn active'
                : 'filter-btn'
            }
            onClick={() =>
              setPaymentPeriod(
                'month'
              )
            }
          >
            This Month
          </button>


          <button
            type="button"
            className={
              paymentPeriod === 'all'
                ? 'filter-btn active'
                : 'filter-btn'
            }
            onClick={() =>
              setPaymentPeriod(
                'all'
              )
            }
          >
            All Time
          </button>

        </div>


        {payments && (
          <>

            <div className="stats-grid">

              <StatCard
                label="Gross revenue"
                value={money(
                  payments.gross_revenue
                )}
                meta="Paid bookings"
                icon="₹"
              />

              <StatCard
                label="Platform fees"
                value={money(
                  payments.platform_revenue
                )}
                meta="MediConnect revenue"
                icon="%"
              />

              <StatCard
                label="Doctor payouts"
                value={money(
                  payments.doctor_payouts
                )}
                meta="Net doctor earnings"
                icon="D"
              />

              <StatCard
                label="Paid bookings"
                value={
                  payments.paid_bookings
                }
                meta="Successful payments"
                icon="✓"
              />

            </div>


            <div className="stack">

              {payments.transactions?.length >
              0 ? (
                payments.transactions.map(
                  (transaction) => (
                    <div
                      className="request-card"
                      key={
                        transaction.payment_id
                      }
                    >

                      <div>

                        <span className="muted">
                          {
                            transaction.transaction_id ||
                            `Payment #${transaction.payment_id}`
                          }
                        </span>

                        <h3>
                          {
                            transaction.service_title
                          }
                        </h3>

                        <p>
                          {
                            transaction.patient_name
                          }
                          {' → '}
                          {
                            transaction.doctor_name
                          }
                        </p>

                        <small>
                          {transaction.payment_method ||
                            'Payment'}
                          {' · '}
                          {dateTime(
                            transaction.created_at
                          )}
                        </small>

                      </div>


                      <div className="request-actions">

                        <strong>
                          {money(
                            transaction.amount
                          )}
                        </strong>

                        <small>
                          Platform:{' '}
                          {money(
                            transaction.platform_fee
                          )}
                        </small>

                        <small>
                          Doctor:{' '}
                          {money(
                            transaction.doctor_amount
                          )}
                        </small>

                      </div>

                    </div>
                  )
                )
              ) : (
                <div className="empty-card">

                  <h3>
                    No paid transactions
                  </h3>

                  <p>
                    No successful payments exist for this period.
                  </p>

                </div>
              )}

            </div>

          </>
        )}

      </Shell>
    );
  }


  // =====================================================
  // SETTINGS
  // =====================================================

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
        unread={unread}
      >

        <Settings
          user={user}
          onLogout={onLogout}
          onBack={() =>
            setPage('overview')
          }
        />

      </Shell>
    );
  }


  // =====================================================
  // OVERVIEW
  // =====================================================

  const stats =
    dashboard || {};

  const users =
    stats.users || {};

  const doctorStats =
    stats.doctors || {};

  const consultationStats =
    stats.consultations || {};

  const paymentStats =
    stats.payments || {};

  const platformFeeRule =
    paymentStats.platform_fee_rule ||
    stats.platform_fee_rule ||
    'Current platform fee settings';


  return (
    <Shell
      user={user}
      onLogout={onLogout}
      page={page}
      setPage={setPage}
      onNotifications={
        onNotifications
      }
      unread={unread}
    >

      <PageHeader
        eyebrow="ADMIN WORKSPACE"
        title="Platform overview"
        description="Monitor patients, doctors, consultations and platform performance."
      />


      <div className="stats-grid">

        <StatCard
          label="Patients"
          value={
            users.total_patients || 0
          }
          meta={`${users.active_patients || 0} active`}
          icon="P"
        />

        <StatCard
          label="Doctors"
          value={
            doctorStats.total || 0
          }
          meta={`${doctorStats.verified || 0} verified`}
          icon="D"
        />

        <StatCard
          label="Pending doctors"
          value={
            doctorStats.pending || 0
          }
          meta="Need verification"
          icon="!"
        />

        <StatCard
          label="Pending requests"
          value={
            stats
              .appointment_requests
              ?.pending || 0
          }
          meta="Need assignment"
          icon="R"
        />

      </div>


      <div className="stats-grid">

        <StatCard
          label="Consultations"
          value={
            consultationStats.total ||
            0
          }
          meta={`${consultationStats.completed || 0} completed`}
          icon="C"
        />

        <StatCard
          label="Gross revenue"
          value={money(
            paymentStats.gross_revenue
          )}
          meta="All paid bookings"
          icon="₹"
        />

        <StatCard
          label="Platform revenue"
          value={money(
            paymentStats.platform_revenue
          )}
          meta={platformFeeRule}
          icon="%"
        />

        <StatCard
          label="Doctor payouts"
          value={money(
            paymentStats.doctor_payouts
          )}
          meta="Paid doctor earnings"
          icon="D"
        />

      </div>


      <div className="section-title">

        <h2>
          Recent pending requests
        </h2>

        <button
          type="button"
          className="text-btn"
          onClick={() =>
            setPage('requests')
          }
        >
          View all
        </button>

      </div>


      <div className="stack">

        {requests.length > 0 ? (
          requests
            .slice(0, 5)
            .map((request) => (
              <div
                className="request-card"
                key={request.id}
              >

                <div>

                  <span className="muted">
                    Request #
                    {request.id}
                  </span>

                  <h3>
                    {request.specialization ||
                      'Medical consultation'}
                  </h3>

                  <p>
                    {request.preferred_date ||
                      'Date not specified'}
                    {' · '}
                    {String(
                      request.preferred_time ||
                        ''
                    ).slice(
                      0,
                      5
                    )}
                  </p>

                </div>

                <span className="status pending">
                  PENDING
                </span>

              </div>
            ))
        ) : (
          <div className="empty-card">

            <h3>
              All clear
            </h3>

            <p>
              No appointment requests need assignment.
            </p>

          </div>
        )}

      </div>


      <div className="section-title">

        <h2>
          Platform activity
        </h2>

      </div>


      <div className="admin-mini-grid">

        <div className="admin-mini-card">

          <span className="muted">
            Ongoing consultations
          </span>

          <strong>
            {consultationStats.ongoing ||
              0}
          </strong>

        </div>


        <div className="admin-mini-card">

          <span className="muted">
            Cancelled consultations
          </span>

          <strong>
            {consultationStats.cancelled ||
              0}
          </strong>

        </div>


        <div className="admin-mini-card">

          <span className="muted">
            Today's platform fees
          </span>

          <strong>
            {money(
              paymentStats.today
                ?.platform_revenue
            )}
          </strong>

        </div>


        <div className="admin-mini-card">

          <span className="muted">
            This month's platform fees
          </span>

          <strong>
            {money(
              paymentStats.month
                ?.platform_revenue
            )}
          </strong>

        </div>

      </div>

    </Shell>
  );
}


// =========================================================
// SHELL
// =========================================================

function Shell({
  children,
  user,
  onLogout,
  page,
  setPage,
  onNotifications,
  unread = 0,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  return (
    <div className="app-shell">

      <Sidebar
        role="ADMIN"
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
          onNotifications={
            onNotifications
          }
          unread={unread}

          onMenuToggle={() =>
            setMobileMenuOpen(
              (open) => !open
            )
          }

          mobileMenuOpen={
            mobileMenuOpen
          }

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