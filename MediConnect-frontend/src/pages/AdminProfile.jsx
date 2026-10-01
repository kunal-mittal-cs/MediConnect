import React from 'react';
import { initials } from '../utils';

export default function AdminProfile({
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
            ADMIN ACCOUNT
          </span>

          <h1>
            My Profile
          </h1>

          <p>
            View your MediConnect administrator
            account information.
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
                {user?.name || 'Administrator'}
              </h2>

              <span className="profile-status-badge">
                {accountStatus}
              </span>

            </div>

            <p>
              {user?.email || 'No email available'}
            </p>

            <span className="profile-role-badge admin">
              Administrator
            </span>

          </div>

        </div>

      </section>


      <div className="profile-content-grid">

        <section className="profile-info-card">

          <div className="profile-card-heading">

            <div className="profile-card-icon admin">
              ⚙
            </div>

            <div>
              <h2>
                Administrator information
              </h2>

              <p>
                Your MediConnect administrator account details.
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
                Administrator
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
              Manage your account
            </h3>

            <p>
              Update your administrator information
              or change your account password.
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
                Administrator access
              </strong>

              <p>
                Platform management controls are
                available through your admin workspace.
              </p>
            </div>

          </section>

        </aside>

      </div>

    </div>
  );
}