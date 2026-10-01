import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import api from '../api';

import { dateTime, toast } from '../utils';
import PageHeader from '../components/PageHeader';

const EMPTY_FORM = {
  specialization: '',
  preferred_date: '',
  preferred_time: '',
  message: '',
};

export default function Appointments({
  onOpen,
}) {
  const [requests, setRequests] = useState([]);
  const [consultations, setConsultations] =
    useState([]);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [selectedDate, setSelectedDate] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10)
    );

  const load = async () => {
    setLoading(true);

    try {
      const [
        requestsResult,
        consultationsResult,
      ] = await Promise.allSettled([
        api.get('/appointment-requests/my'),
        api.get('/consultations/my'),
      ]);

      if (
        requestsResult.status ===
        'fulfilled'
      ) {
        setRequests(
          Array.isArray(
            requestsResult.value.data
          )
            ? requestsResult.value.data
            : []
        );
      } else {
        setRequests([]);
      }

      if (
        consultationsResult.status ===
        'fulfilled'
      ) {
        setConsultations(
          Array.isArray(
            consultationsResult.value.data
          )
            ? consultationsResult.value.data
            : []
        );
      } else {
        setConsultations([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateField = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (
      !form.specialization.trim() ||
      !form.preferred_date ||
      !form.preferred_time
    ) {
      toast(
        'Please complete the required fields',
        'error'
      );
      return;
    }

    setSubmitting(true);

    try {
      await api.post(
        '/appointment-requests/',
        {
          specialization:
            form.specialization.trim(),
          preferred_date:
            form.preferred_date,
          preferred_time:
            form.preferred_time,
          message:
            form.message.trim(),
        }
      );

      toast(
        'Appointment request submitted'
      );

      setForm({
        ...EMPTY_FORM,
      });

      await load();
    } catch (error) {
      toast(
        error.response?.data?.detail ||
          'Could not submit request',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const upcoming = useMemo(() => {
    const now = new Date();

    return consultations
      .filter((item) => {
        if (!item.scheduled_at) {
          return false;
        }

        const scheduled =
          new Date(item.scheduled_at);

        const status = String(
          item.status || ''
        ).toUpperCase();

        return (
          !Number.isNaN(
            scheduled.getTime()
          ) &&
          scheduled >= now &&
          ['CONFIRMED', 'PENDING'].includes(
            status
          )
        );
      })
      .sort(
        (a, b) =>
          new Date(a.scheduled_at) -
          new Date(b.scheduled_at)
      );
  }, [consultations]);

  const selectedDayAppointments =
    useMemo(() => {
      return consultations
        .filter((item) => {
          if (!item.scheduled_at) {
            return false;
          }

          const date = new Date(
            item.scheduled_at
          );

          if (Number.isNaN(date.getTime())) {
            return false;
          }

          return (
            date.toISOString().slice(0, 10) ===
            selectedDate
          );
        })
        .sort(
          (a, b) =>
            new Date(a.scheduled_at) -
            new Date(b.scheduled_at)
        );
    }, [
      consultations,
      selectedDate,
    ]);

  const formatSelectedDate = () => {
    const date = new Date(
      `${selectedDate}T00:00:00`
    );

    if (Number.isNaN(date.getTime())) {
      return selectedDate;
    }

    return date.toLocaleDateString(
      'en-IN',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow="APPOINTMENTS"
        title="Your appointments"
        description="View upcoming consultations, manage your calendar, and request care when needed."
      />

      {/* ---------------------------------------
          UPCOMING APPOINTMENTS
      --------------------------------------- */}

      <section className="section-block">
        <div className="section-title">
          <div>
            <h2>
              Upcoming appointments
            </h2>

            <p className="muted">
              Your confirmed and pending
              consultations.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="loading-card">
            Loading appointments…
          </div>
        ) : upcoming.length > 0 ? (
          <div className="stack">
            {upcoming.map(
              (appointment) => (
                <div
                  className="calendar-event"
                  key={appointment.id}
                >
                  <div className="calendar-event-time">
                    <strong>
                      {new Date(
                        appointment.scheduled_at
                      ).toLocaleTimeString(
                        'en-IN',
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </strong>

                    {appointment.ends_at && (
                      <span>
                        to{' '}
                        {new Date(
                          appointment.ends_at
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
                      {appointment.service_title ||
                        'Consultation'}
                    </strong>

                    <span>
                      {dateTime(
                        appointment.scheduled_at
                      )}
                    </span>

                    <small>
                      {String(
                        appointment.status || ''
                      ).toUpperCase()}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="secondary-btn small"
                    onClick={() =>
                      onOpen?.(
                        appointment
                      )
                    }
                  >
                    Open
                  </button>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="empty-card">
            <h3>
              No upcoming appointments
            </h3>

            <p>
              Book a doctor to see your
              upcoming consultation here.
            </p>
          </div>
        )}
      </section>

      {/* ---------------------------------------
          CALENDAR
      --------------------------------------- */}

      <section className="section-block">
        <div className="section-title">
          <div>
            <h2>
              Consultation calendar
            </h2>

            <p className="muted">
              Select a date to see your
              scheduled consultations.
            </p>
          </div>
        </div>

        <div className="form-card calendar-toolbar">
          <label>
            Select date

            <input
              type="date"
              value={selectedDate}
              onChange={(event) =>
                setSelectedDate(
                  event.target.value
                )
              }
            />
          </label>

          <div className="calendar-date-label">
            <span>
              Selected day
            </span>

            <strong>
              {formatSelectedDate()}
            </strong>
          </div>
        </div>

        {selectedDayAppointments.length >
        0 ? (
          <div className="stack">
            {selectedDayAppointments.map(
              (item) => (
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
                        to{' '}
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
                      {item.doctor_name ||
                        'Doctor consultation'}
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
                      onOpen?.(item)
                    }
                  >
                    Open
                  </button>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="empty-card">
            <h3>
              Nothing scheduled
            </h3>

            <p>
              You have no consultations
              scheduled for{' '}
              {formatSelectedDate()}.
            </p>
          </div>
        )}
      </section>

      {/* ---------------------------------------
          REQUEST APPOINTMENT
      --------------------------------------- */}

      <section className="section-block">
        <div className="section-title">
          <div>
            <h2>
              Request an appointment
            </h2>

            <p className="muted">
              Request a specific specialty
              and preferred time.
            </p>
          </div>
        </div>

        <form
          className="form-card"
          onSubmit={submit}
        >
          <div className="form-row">
            <label>
              Specialization

              <input
                type="text"
                required
                value={
                  form.specialization
                }
                onChange={(event) =>
                  updateField(
                    'specialization',
                    event.target.value
                  )
                }
                placeholder="e.g. Cardiology"
                disabled={submitting}
              />
            </label>

            <label>
              Preferred date

              <input
                type="date"
                required
                min={
                  new Date()
                    .toISOString()
                    .slice(0, 10)
                }
                value={
                  form.preferred_date
                }
                onChange={(event) =>
                  updateField(
                    'preferred_date',
                    event.target.value
                  )
                }
                disabled={submitting}
              />
            </label>

            <label>
              Preferred time

              <input
                type="time"
                required
                value={
                  form.preferred_time
                }
                onChange={(event) =>
                  updateField(
                    'preferred_time',
                    event.target.value
                  )
                }
                disabled={submitting}
              />
            </label>
          </div>

          <label>
            Message

            <textarea
              value={form.message}
              onChange={(event) =>
                updateField(
                  'message',
                  event.target.value
                )
              }
              maxLength={5000}
              placeholder="Briefly describe what you need help with."
              disabled={submitting}
            />
          </label>

          <button
            type="submit"
            className="primary-btn"
            disabled={submitting}
          >
            {submitting
              ? 'Sending…'
              : 'Send request'}
          </button>
        </form>
      </section>

      {/* ---------------------------------------
          REQUEST HISTORY
      --------------------------------------- */}

      <section className="section-block">
        <div className="section-title">
          <div>
            <h2>
              Request history
            </h2>

            <p className="muted">
              Track appointment requests sent
              to doctors.
            </p>
          </div>
        </div>

        <div className="stack">
          {loading ? (
            <div className="loading-card">
              Loading requests…
            </div>
          ) : requests.length > 0 ? (
            requests.map((item) => {
              const status = String(
                item.status || 'PENDING'
              ).toUpperCase();

              return (
                <div
                  className="request-card"
                  key={item.id}
                >
                  <div>
                    <span className="muted">
                      Request #{item.id}
                    </span>

                    <h3>
                      {item.specialization}
                    </h3>

                    <p>
                      {item.preferred_date}
                      {' · '}
                      {String(
                        item.preferred_time ||
                          ''
                      ).slice(0, 5)}
                    </p>

                    {item.message && (
                      <small>
                        {item.message}
                      </small>
                    )}

                    {item.assigned_doctor_id && (
                      <small>
                        Assigned doctor: #
                        {item.assigned_doctor_id}
                      </small>
                    )}
                  </div>

                  <span
                    className={`status ${status.toLowerCase()}`}
                  >
                    {status}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="empty-card">
              <h3>
                No requests yet
              </h3>

              <p>
                Your appointment requests will
                appear here.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}