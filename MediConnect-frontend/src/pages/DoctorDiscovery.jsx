import React, { useEffect, useState } from 'react';
import api from '../api';
import { initials, money } from '../utils';

export default function DoctorDiscovery({
  onBack,
  onViewProfile,
  onBook,
}) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadDoctors = async () => {
      try {
        const response = await api.get('/doctors/discover');

        if (!cancelled) {
          setDoctors(
            Array.isArray(response.data)
              ? response.data
              : []
          );
        }
      } catch {
        if (!cancelled) {
          setDoctors([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDoctors();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredDoctors = doctors.filter((doctor) => {
    const searchText =
      `${doctor.name || ''} ${doctor.specialization || ''} ${doctor.qualification || ''}`
        .toLowerCase();

    return searchText.includes(
      search.toLowerCase()
    );
  });

  return (
    <div className="discovery-page">

      <div className="page-heading">

        <button
          type="button"
          className="back-btn"
          onClick={onBack}
        >
          ← Dashboard
        </button>

        <span className="section-kicker">
          FIND CARE
        </span>

        <h1>Find a doctor</h1>

        <p>
          Browse verified professionals and choose
          a consultation that fits your needs.
        </p>

      </div>

      <div className="doctor-search">
        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search doctor, specialty or qualification..."
        />
      </div>

      {loading ? (
        <div className="loading-card">
          Finding available doctors...
        </div>
      ) : filteredDoctors.length > 0 ? (

        <div className="doctor-discovery-grid">

          {filteredDoctors.map((doctor) => (

            <article
              className="doctor-discovery-card"
              key={doctor.id}
            >

              <div className="discovery-card-header">

                <div className="doctor-discovery-avatar">
                  {initials(doctor.name)}
                </div>

                <div className="discovery-doctor-info">

                  <div className="discovery-name">

                    <h2>
                      {doctor.name}
                    </h2>

                    {doctor.verification_status ===
                      'VERIFIED' && (
                      <span className="verified-badge">
                        ✓ Verified
                      </span>
                    )}

                  </div>

                  <span className="discovery-specialty">
                    {doctor.specialization}
                  </span>

                </div>

              </div>

              <p className="discovery-bio">
                {doctor.bio ||
                  'Professional healthcare consultation.'}
              </p>

              <div className="discovery-facts">

                <span>
                  {doctor.experience || 0} years
                  experience
                </span>

                <span>
                  From {money(
                    doctor.consultation_fee
                  )}
                </span>

              </div>

              <div className="doctor-card-actions">

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    onViewProfile?.(doctor)
                  }
                >
                  View Profile
                </button>

                <button
                  type="button"
                  className="primary-btn"
                  onClick={() =>
                    onBook?.(doctor)
                  }
                >
                  Book Consultation
                </button>

              </div>

            </article>

          ))}

        </div>

      ) : (

        <div className="empty-card">

          <h3>
            No doctors found
          </h3>

          <p>
            Try another doctor name or specialty.
          </p>

        </div>

      )}

    </div>
  );
}