import React from 'react';
import { initials } from '../utils';

export default function PatientProfile({
  user,
  onBack,
  onSettings,
}) {
  const accountStatus =
    user?.is_active ? 'Active' : 'Inactive';

  return (
    <div className="profile-page">

      <div className="profile-page-header">

        <button
          type="button"
          className="back-btn"
          onClick={onBack}
        >
          ← Back
        </button>

        <div className="profile-heading">
          <span className="section-kicker">
            ACCOUNT
          </span>

          <h1>
            My Profile
          </h1>

          <p>
            View your MediConnect account information
            and manage your account settings.
          </p>
        </div>

      </div>


      <section className="profile-overview-card">

        <div className="profile-overview-main">

          <div className="profile-avatar-large">
            {initials(user?.name)}
          </div>

          <div className="profile-overview-info">

            <div className="profile-name-row">

              <h2>
                {user?.name || 'Patient'}
              </h2>

              <span className="profile-status-badge">
                {accountStatus}
              </span>

            </div>

            <p>
              {user?.email || 'No email available'}
            </p>

            <span className="profile-role-badge">
              Patient
            </span>

          </div>

        </div>

      </section>


      <div className="profile-content-grid">

        <section className="profile-info-card">

          <div className="profile-card-heading">

            <div className="profile-card-icon">
              👤
            </div>

            <div>
              <h2>
                Personal information
              </h2>

              <p>
                Your basic MediConnect account details.
              </p>
            </div>

          </div>


          <div className="profile-details-grid">

            <div className="profile-detail-box">
              <span>
                Full name
              </span>

              <strong>
                {user?.name || 'Not available'}
              </strong>
            </div>

            <div className="profile-detail-box">
              <span>
                Email address
              </span>

              <strong>
                {user?.email || 'Not available'}
              </strong>
            </div>

            <div className="profile-detail-box">
              <span>
                Account type
              </span>

              <strong>
                Patient
              </strong>
            </div>

            <div className="profile-detail-box">
              <span>
                Account status
              </span>

              <strong>
                {accountStatus}
              </strong>
            </div>

          </div>

        </section>


        <aside className="profile-side-panel">

          <section className="profile-action-card">

            <span className="section-kicker">
              ACCOUNT MANAGEMENT
            </span>

            <h3>
              Keep your account up to date
            </h3>

            <p>
              Update your personal information or
              change your password from Settings.
            </p>

            <button
              type="button"
              className="primary-btn full"
              onClick={onSettings}
            >
              Open Settings →
            </button>

          </section>


          <section className="profile-account-note">

            <span>
              ✓
            </span>

            <div>
              <strong>
                MediConnect account
              </strong>

              <p>
                Your profile information is used
                to manage your healthcare experience.
              </p>
            </div>

          </section>

        </aside>

      </div>

    </div>
  );
}