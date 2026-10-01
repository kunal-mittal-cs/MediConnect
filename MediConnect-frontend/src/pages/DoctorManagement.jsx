import React, { useEffect, useState } from 'react';
import api from '../api';
import ServiceCard from '../components/ServiceCard';
import { money, toast } from '../utils';

const emptyProfile = {
  specialization: '',
  qualification: '',
  experience: 0,
  bio: '',
  consultation_fee: 0,
};

const emptyService = {
  service_type: 'VIDEO',
  title: '',
  description: '',
  price: 0,
  duration_value: 30,
  duration_unit: 'MINUTES',
  chat_enabled: true,
  voice_enabled: false,
  video_enabled: true,
  document_enabled: true,
};

const emptySlot = {
  available_date: '',
  start_time: '10:00',
  end_time: '18:00',
};

const durationToMinutes = (value, unit) => {
  const number = Number(value) || 0;

  if (unit === 'HOURS') return number * 60;
  if (unit === 'DAYS') return number * 1440;

  return number;
};

const formatDate = (value) => {
  if (!value) return '';

  const date = new Date(
    `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function DoctorManagement({
  mode = 'profile',
}) {
  const [profile, setProfile] =
    useState(emptyProfile);

  const [services, setServices] = useState([]);
  const [availability, setAvailability] =
    useState([]);

  const [available, setAvailable] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [addingService, setAddingService] =
    useState(false);

  const [savingAvailability, setSavingAvailability] =
    useState(false);

  const [service, setService] =
    useState({ ...emptyService });

  const [slot, setSlot] =
    useState({ ...emptySlot });

  const load = async () => {
    setLoading(true);

    const results =
      await Promise.allSettled([
        api.get('/doctors/profile'),
        api.get('/doctors/services'),
        api.get('/doctors/availability'),
      ]);

    if (
      results[0].status === 'fulfilled'
    ) {
      const data =
        results[0].value.data || {};

      setProfile({
        specialization:
          data.specialization || '',
        qualification:
          data.qualification || '',
        experience:
          Number(data.experience) || 0,
        bio: data.bio || '',
        consultation_fee:
          Number(data.consultation_fee) || 0,
      });

      setAvailable(
        Boolean(data.is_available)
      );
    }

    if (
      results[1].status === 'fulfilled'
    ) {
      setServices(
        Array.isArray(
          results[1].value.data
        )
          ? results[1].value.data
          : []
      );
    }

    if (
      results[2].status === 'fulfilled'
    ) {
      setAvailability(
        Array.isArray(
          results[2].value.data
        )
          ? results[2].value.data
          : []
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();

    if (
      !profile.specialization.trim() ||
      !profile.qualification.trim()
    ) {
      toast(
        'Specialization and qualification are required.',
        'error'
      );
      return;
    }

    setSavingProfile(true);

    try {
      const payload = {
        ...profile,
        specialization:
          profile.specialization.trim(),
        qualification:
          profile.qualification.trim(),
        bio: profile.bio.trim(),
        experience:
          Number(profile.experience) || 0,
        consultation_fee:
          Number(profile.consultation_fee) || 0,
      };

      let response;

      try {
        response = await api.put(
          '/doctors/profile',
          payload
        );
      } catch (error) {
        if (
          error.response?.status !== 404
        ) {
          throw error;
        }

        response = await api.post(
          '/doctors/profile',
          payload
        );
      }

      if (response.data) {
        setProfile((current) => ({
          ...current,
          ...response.data,
        }));

        setAvailable(
          Boolean(
            response.data.is_available ??
              available
          )
        );
      }

      toast(
        'Professional profile updated.'
      );
    } catch (error) {
      toast(
        error.response?.data?.detail ||
          'Could not update profile.',
        'error'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleAvailability = async () => {
    try {
      const response = await api.put(
        '/doctors/availability/status',
        {
          is_available: !available,
        }
      );

      setAvailable(
        Boolean(
          response.data?.is_available
        )
      );

      toast(
        !available
          ? 'You are now available.'
          : 'You are now unavailable.'
      );
    } catch (error) {
      toast(
        error.response?.data?.detail ||
          'Could not update availability.',
        'error'
      );
    }
  };

  const addService = async (event) => {
    event.preventDefault();

    if (!service.title.trim()) {
      toast(
        'Service title is required.',
        'error'
      );
      return;
    }

    const minutes =
      durationToMinutes(
        service.duration_value,
        service.duration_unit
      );

    if (minutes <= 0) {
      toast(
        'Enter a valid duration.',
        'error'
      );
      return;
    }

    setAddingService(true);

    try {
      const response = await api.post(
        '/doctors/services',
        {
          ...service,
          title: service.title.trim(),
          description:
            service.description.trim(),
          price:
            Number(service.price) || 0,
          duration_value:
            Number(service.duration_value),
          duration_minutes: minutes,
        }
      );

      if (response.data) {
        setServices((current) => [
          ...current,
          response.data,
        ]);
      }

      setService({
        ...emptyService,
      });

      toast('Service added.');
    } catch (error) {
      toast(
        error.response?.data?.detail ||
          'Could not add service.',
        'error'
      );
    } finally {
      setAddingService(false);
    }
  };

  const addAvailability = async (
    event
  ) => {
    event.preventDefault();

    if (!slot.available_date) {
      toast(
        'Select a date.',
        'error'
      );
      return;
    }

    if (
      slot.end_time <=
      slot.start_time
    ) {
      toast(
        'End time must be later than start time.',
        'error'
      );
      return;
    }

    setSavingAvailability(true);

    try {
      const response = await api.post(
        '/doctors/availability',
        slot
      );

      if (response.data) {
        setAvailability(
          (current) => [
            ...current,
            response.data,
          ]
        );
      }

      setSlot({
        ...emptySlot,
      });

      toast('Availability added.');
    } catch (error) {
      toast(
        error.response?.data?.detail ||
          'Could not add availability.',
        'error'
      );
    } finally {
      setSavingAvailability(false);
    }
  };

  const deleteAvailability = async (
    id
  ) => {
    if (
      !window.confirm(
        'Remove this availability slot?'
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/doctors/availability/${id}`
      );

      setAvailability(
        (current) =>
          current.filter(
            (item) => item.id !== id
          )
      );

      toast('Availability removed.');
    } catch (error) {
      toast(
        error.response?.data?.detail ||
          'Could not remove availability.',
        'error'
      );
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-heading">
          <span className="section-kicker">
            DOCTOR MANAGEMENT
          </span>
          <h1>
            {mode === 'availability'
              ? 'Availability'
              : 'Professional profile'}
          </h1>
        </div>

        <div className="loading-card">
          Loading...
        </div>
      </div>
    );
  }

  if (mode === 'availability') {
    return (
      <div className="management-page">
        <div className="page-heading">
          <span className="section-kicker">
            SCHEDULING
          </span>

          <h1>Availability</h1>

          <p>
            Control when patients can book
            your consultation services.
          </p>
        </div>

        <section className="management-status-card">
          <div>
            <span className="section-kicker">
              BOOKING STATUS
            </span>

            <h2>
              {available
                ? 'You are currently available'
                : 'You are currently unavailable'}
            </h2>

            <p>
              {available
                ? 'Patients can discover you and book available services.'
                : 'Patients will not be offered new bookings while unavailable.'}
            </p>
          </div>

          <button
            type="button"
            className={
              available
                ? 'status-toggle active'
                : 'status-toggle'
            }
            onClick={toggleAvailability}
          >
            <span />
            {available
              ? 'Available'
              : 'Unavailable'}
          </button>
        </section>

        <section className="management-card">
          <div className="management-card-heading">
            <div>
              <span className="section-kicker">
                NEW AVAILABILITY
              </span>
              <h2>Add working hours</h2>
            </div>
          </div>

          <form
            onSubmit={addAvailability}
            className="management-form"
          >
            <div className="form-grid">
              <label>
                Date
                <input
                  type="date"
                  min={
                    new Date()
                      .toISOString()
                      .slice(0, 10)
                  }
                  value={
                    slot.available_date
                  }
                  onChange={(event) =>
                    setSlot(
                      (current) => ({
                        ...current,
                        available_date:
                          event.target.value,
                      })
                    )
                  }
                  required
                />
              </label>

              <label>
                Start time
                <input
                  type="time"
                  value={slot.start_time}
                  onChange={(event) =>
                    setSlot(
                      (current) => ({
                        ...current,
                        start_time:
                          event.target.value,
                      })
                    )
                  }
                  required
                />
              </label>

              <label>
                End time
                <input
                  type="time"
                  value={slot.end_time}
                  onChange={(event) =>
                    setSlot(
                      (current) => ({
                        ...current,
                        end_time:
                          event.target.value,
                      })
                    )
                  }
                  required
                />
              </label>
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={savingAvailability}
            >
              {savingAvailability
                ? 'Adding...'
                : 'Add availability'}
            </button>
          </form>
        </section>

        <section className="management-card">
          <div className="management-card-heading">
            <div>
              <span className="section-kicker">
                BOOKABLE PERIODS
              </span>
              <h2>
                Scheduled availability
              </h2>
            </div>
          </div>

          {availability.length === 0 ? (
            <div className="empty-inner">
              <strong>
                No availability added
              </strong>
              <p>
                Add your first working period
                above.
              </p>
            </div>
          ) : (
            <div className="availability-list">
              {availability
                .slice()
                .sort((a, b) =>
                  `${a.available_date}${a.start_time}`.localeCompare(
                    `${b.available_date}${b.start_time}`
                  )
                )
                .map((item) => (
                  <div
                    className="availability-row"
                    key={item.id}
                  >
                    <div>
                      <strong>
                        {formatDate(
                          item.available_date
                        )}
                      </strong>

                      <span>
                        {String(
                          item.start_time
                        ).slice(0, 5)}
                        {' — '}
                        {String(
                          item.end_time
                        ).slice(0, 5)}
                      </span>
                    </div>

                    <div className="availability-actions">
                      <span
                        className={
                          item.is_booked
                            ? 'slot-status booked'
                            : 'slot-status'
                        }
                      >
                        {item.is_booked
                          ? 'Booked'
                          : 'Open'}
                      </span>

                      {!item.is_booked && (
                        <button
                          type="button"
                          className="danger-btn small"
                          onClick={() =>
                            deleteAvailability(
                              item.id
                            )
                          }
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="management-page">
      <div className="page-heading">
        <span className="section-kicker">
          DOCTOR MANAGEMENT
        </span>

        <h1>Professional profile</h1>

        <p>
          Manage the information patients see
          and the services they can book.
        </p>
      </div>

      <section className="management-card">
        <div className="management-card-heading">
          <div>
            <span className="section-kicker">
              PROFESSIONAL INFORMATION
            </span>

            <h2>Your doctor profile</h2>

            <p>
              This information appears on your
              public doctor profile.
            </p>
          </div>

          <button
            type="button"
            className={
              available
                ? 'status-toggle active'
                : 'status-toggle'
            }
            onClick={toggleAvailability}
          >
            <span />
            {available
              ? 'Available'
              : 'Unavailable'}
          </button>
        </div>

        <form
          onSubmit={saveProfile}
          className="management-form"
        >
          <div className="form-grid">
            <label>
              Specialization
              <input
                value={profile.specialization}
                onChange={(event) =>
                  setProfile(
                    (current) => ({
                      ...current,
                      specialization:
                        event.target.value,
                    })
                  )
                }
                placeholder="Cardiology"
                required
              />
            </label>

            <label>
              Qualification
              <input
                value={profile.qualification}
                onChange={(event) =>
                  setProfile(
                    (current) => ({
                      ...current,
                      qualification:
                        event.target.value,
                    })
                  )
                }
                placeholder="MBBS, MD Cardiology"
                required
              />
            </label>

            <label>
              Experience
              <input
                type="number"
                min="0"
                value={profile.experience}
                onChange={(event) =>
                  setProfile(
                    (current) => ({
                      ...current,
                      experience:
                        event.target.value,
                    })
                  )
                }
              />
            </label>

            <label>
              Consultation fee
              <input
                type="number"
                min="0"
                value={
                  profile.consultation_fee
                }
                onChange={(event) =>
                  setProfile(
                    (current) => ({
                      ...current,
                      consultation_fee:
                        event.target.value,
                    })
                  )
                }
              />
            </label>
          </div>

          <label>
            Professional biography
            <textarea
              rows="5"
              value={profile.bio}
              onChange={(event) =>
                setProfile(
                  (current) => ({
                    ...current,
                    bio: event.target.value,
                  })
                )
              }
              placeholder="Describe your experience and areas of care."
            />
          </label>

          <button
            type="submit"
            className="primary-btn"
            disabled={savingProfile}
          >
            {savingProfile
              ? 'Saving...'
              : 'Save professional profile'}
          </button>
        </form>
      </section>

      <section className="management-card">
        <div className="management-card-heading">
          <div>
            <span className="section-kicker">
              SERVICES
            </span>

            <h2>Consultation services</h2>

            <p>
              Create the services patients can
              purchase and book.
            </p>
          </div>
        </div>

        {services.length > 0 && (
          <div className="service-grid management-services">
            {services.map((item) => (
              <ServiceCard
                key={item.id}
                service={item}
              />
            ))}
          </div>
        )}

        <form
          onSubmit={addService}
          className="service-create-box"
        >
          <div className="service-create-heading">
            <h3>Create a new service</h3>
            <p>
              Set the price, duration and
              consultation features.
            </p>
          </div>

          <div className="form-grid">
            <label>
              Service type
              <select
                value={service.service_type}
                onChange={(event) =>
                  setService(
                    (current) => ({
                      ...current,
                      service_type:
                        event.target.value,
                    })
                  )
                }
              >
                <option value="EXTENDED_CHAT">
                  Extended Chat
                </option>
                <option value="VOICE">
                  Voice Consultation
                </option>
                <option value="VIDEO">
                  Video Consultation
                </option>
                <option value="FULL_CONSULTATION">
                  Full Consultation
                </option>
              </select>
            </label>

            <label>
              Service title
              <input
                value={service.title}
                onChange={(event) =>
                  setService(
                    (current) => ({
                      ...current,
                      title:
                        event.target.value,
                    })
                  )
                }
                placeholder="Cardiology Consultation"
                required
              />
            </label>

            <label>
              Price
              <input
                type="number"
                min="0"
                value={service.price}
                onChange={(event) =>
                  setService(
                    (current) => ({
                      ...current,
                      price:
                        event.target.value,
                    })
                  )
                }
              />
            </label>

            <label>
              Duration
              <input
                type="number"
                min="1"
                value={
                  service.duration_value
                }
                onChange={(event) =>
                  setService(
                    (current) => ({
                      ...current,
                      duration_value:
                        event.target.value,
                    })
                  )
                }
              />
            </label>

            <label>
              Duration unit
              <select
                value={
                  service.duration_unit
                }
                onChange={(event) =>
                  setService(
                    (current) => ({
                      ...current,
                      duration_unit:
                        event.target.value,
                    })
                  )
                }
              >
                <option value="MINUTES">
                  Minutes
                </option>
                <option value="HOURS">
                  Hours
                </option>
                <option value="DAYS">
                  Days
                </option>
              </select>
            </label>
          </div>

          <label>
            Description
            <textarea
              rows="3"
              value={service.description}
              onChange={(event) =>
                setService(
                  (current) => ({
                    ...current,
                    description:
                      event.target.value,
                  })
                )
              }
              placeholder="What does this consultation include?"
            />
          </label>

          <div className="feature-checks">
            {[
              ['chat_enabled', 'Chat'],
              ['voice_enabled', 'Voice'],
              ['video_enabled', 'Video'],
              ['document_enabled', 'Documents'],
            ].map(([field, label]) => (
              <label key={field}>
                <input
                  type="checkbox"
                  checked={service[field]}
                  onChange={(event) =>
                    setService(
                      (current) => ({
                        ...current,
                        [field]:
                          event.target.checked,
                      })
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>

          <div className="service-create-footer">
            <span>
              {money(service.price)} ·{' '}
              {service.duration_value}{' '}
              {service.duration_unit.toLowerCase()}
            </span>

            <button
              type="submit"
              className="primary-btn"
              disabled={addingService}
            >
              {addingService
                ? 'Adding...'
                : 'Add service'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}