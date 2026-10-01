import React from 'react';

import {
  money,
  initials,
  shareLink,
} from '../utils';

export default function DoctorCard({
  doctor,
  onView,
  onBook,
}) {
  if (!doctor) {
    return null;
  }

  const name = doctor.name || 'Doctor';
  const specialization =
    doctor.specialization || 'General Physician';

  const qualification =
    doctor.qualification ||
    'Qualified Medical Professional';

  const experience = Number(doctor.experience) || 0;

  const fee =
    doctor.consultation_fee ??
    doctor.fee ??
    0;

  const isVerified =
    String(doctor.verification_status || 'VERIFIED')
      .toUpperCase() === 'VERIFIED';

  const isAvailable =
    doctor.is_available !== false;

  const handleShare = () => {
    const doctorUrl =
      `${window.location.origin}/doctor/${doctor.id}`;

    shareLink(
      doctorUrl,
      `Dr. ${name}`
    );
  };

  return (
    <article className="doctor-card">
      <div className="doctor-head">
        <div
          className="avatar"
          aria-hidden="true"
        >
          {initials(name)}
        </div>

        <div className="doctor-title">
          <h3>{name}</h3>

          <p>{specialization}</p>

          {isVerified && (
            <span className="verified">
              ✓ Verified
            </span>
          )}
        </div>

        <button
          type="button"
          className="share-mini"
          onClick={handleShare}
          aria-label={`Share ${name}'s profile`}
          title="Share doctor profile"
        >
          ↗
        </button>
      </div>

      <div className="doctor-meta">
        <span>{qualification}</span>

        <span>
          {experience}+ yrs
        </span>
      </div>

      <div className="doctor-foot">
        <div>
          <small>
            Consultation from
          </small>

          <b>
            {money(fee)}
          </b>
        </div>

        <div className="doctor-actions">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => onView?.(doctor)}
          >
            View profile
          </button>

          <button
            type="button"
            className="primary-btn small"
            onClick={() => onBook?.(doctor)}
            disabled={!isAvailable || !isVerified}
            title={
              !isVerified
                ? 'Doctor is not verified'
                : !isAvailable
                  ? 'Doctor is currently unavailable'
                  : 'Book consultation'
            }
          >
            {isAvailable && isVerified
              ? 'Book'
              : 'Unavailable'}
          </button>
        </div>
      </div>
    </article>
  );
}