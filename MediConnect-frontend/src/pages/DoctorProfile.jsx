import React, { useEffect, useState } from 'react';

import api from '../api';

import ServiceCard from '../components/ServiceCard';

import { initials, money } from '../utils';

export default function DoctorProfile({
  doctor,
  onBack,
  onBook,
  ownProfile = false,
}) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadServices = async () => {
      if (!doctor?.id) {
        setServices([]);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(
          '/doctors/services',
          {
            params: {
              doctor_id: doctor.id,
            },
          }
        );

        if (!cancelled) {
          setServices(
            Array.isArray(response.data)
              ? response.data.filter(
                  (service) =>
                    service.is_active !== false
                )
              : []
          );
        }
      } catch {
        if (!cancelled) {
          setServices([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadServices();

    return () => {
      cancelled = true;
    };
  }, [doctor?.id]);

  if (!doctor) {
    return (
      <div className="empty-card">

        <h3>
          Doctor profile unavailable
        </h3>

        <p>
          Please return and select a doctor again.
        </p>

        <button
          type="button"
          className="secondary-btn"
          onClick={onBack}
        >
          ← Back
        </button>

      </div>
    );
  }

  const available =
    doctor.is_available !== false;

  return (
    <div
      className={
        ownProfile
          ? 'doctor-profile-page doctor-own-profile'
          : 'doctor-profile-page'
      }
    >

      <div className="profile-topbar">

        <button
          type="button"
          className="back-btn"
          onClick={onBack}
        >
          {ownProfile
            ? '← Back'
            : '← Find Doctors'}
        </button>

        {!ownProfile && (
          <button
            type="button"
            className="primary-btn"
            onClick={() =>
              onBook?.(doctor)
            }
          >
            Book Consultation →
          </button>
        )}

      </div>

      <section className="doctor-hero">

        <div className="doctor-hero-main">

          <div className="doctor-large-avatar">
            {initials(doctor.name)}
          </div>

          <div className="doctor-hero-info">

            <div className="doctor-name-line">

              <h1>
                {doctor.name}
              </h1>

              {doctor.verification_status ===
                'VERIFIED' && (
                <span className="verified-badge">
                  ✓ Verified
                </span>
              )}

            </div>

            <p className="doctor-specialization-large">
              {doctor.specialization}
            </p>

            <p className="doctor-qualification-large">
              {doctor.qualification}
            </p>

            <div className="doctor-status-line">

              <span
                className={
                  available
                    ? 'status-indicator available'
                    : 'status-indicator'
                }
              />

              {available
                ? 'Available for consultations'
                : 'Currently unavailable'}

            </div>

          </div>

        </div>

        <div className="doctor-hero-fee">

          <span>
            Consultation from
          </span>

          <strong>
            {money(
              doctor.consultation_fee
            )}
          </strong>

        </div>

      </section>

      <div className="doctor-profile-grid">

        <main>

          <section className="profile-section-card">

            <div className="profile-section-heading">

              <span className="section-kicker">
                PROFESSIONAL OVERVIEW
              </span>

              <h2>
                About the doctor
              </h2>

            </div>

            <p className="profile-bio">
              {doctor.bio ||
                'No professional biography has been added yet.'}
            </p>

          </section>

          <section className="profile-section-card">

            <div className="profile-section-heading">

              <span className="section-kicker">
                PROFESSIONAL INFORMATION
              </span>

              <h2>
                Experience & qualifications
              </h2>

            </div>

            <div className="professional-facts">

              <div>
                <span>
                  Specialization
                </span>

                <strong>
                  {doctor.specialization ||
                    'Not specified'}
                </strong>
              </div>

              <div>
                <span>
                  Qualification
                </span>

                <strong>
                  {doctor.qualification ||
                    'Not specified'}
                </strong>
              </div>

              <div>
                <span>
                  Experience
                </span>

                <strong>
                  {Number(
                    doctor.experience
                  ) || 0}{' '}
                  years
                </strong>
              </div>

              <div>
                <span>
                  Consultation fee
                </span>

                <strong>
                  {money(
                    doctor.consultation_fee
                  )}
                </strong>
              </div>

            </div>

          </section>

          <section className="profile-section-card">

            <div className="profile-section-heading">

              <span className="section-kicker">
                SERVICES
              </span>

              <h2>
                Available consultation services
              </h2>

              <p>
                These services are available from
                this doctor.
              </p>

            </div>

            {loading ? (

              <div className="loading-card">
                Loading services...
              </div>

            ) : services.length > 0 ? (

              <div className="service-grid">

                {services.map((service) => (

                  <ServiceCard
                    key={service.id}
                    service={service}
                    selectable={false}
                  />

                ))}

              </div>

            ) : (

              <div className="empty-inner">

                <strong>
                  No active services
                </strong>

                <p>
                  This doctor has not published
                  any consultation services yet.
                </p>

              </div>

            )}

          </section>

        </main>

        <aside className="doctor-profile-side">

          <section className="profile-side-card">

            <span className="section-kicker">
              AT A GLANCE
            </span>

            <div className="side-stat">

              <strong>
                {Number(
                  doctor.experience
                ) || 0}
              </strong>

              <span>
                Years experience
              </span>

            </div>

            <div className="side-stat">

              <strong>
                {services.length}
              </strong>

              <span>
                Active services
              </span>

            </div>

            <div className="side-stat">

              <strong>
                {available ? 'Yes' : 'No'}
              </strong>

              <span>
                Currently available
              </span>

            </div>

          </section>

          <section className="profile-side-card booking-side-card">

            <span className="section-kicker">
              READY TO BOOK?
            </span>

            <h3>
              Start your consultation
            </h3>

            <p>
              Choose a service, select an available
              date and time, then complete payment.
            </p>

            <button
              type="button"
              className="primary-btn full"
              onClick={() =>
                onBook?.(doctor)
              }
            >
              Book Consultation →
            </button>

          </section>

        </aside>

      </div>

    </div>
  );
}