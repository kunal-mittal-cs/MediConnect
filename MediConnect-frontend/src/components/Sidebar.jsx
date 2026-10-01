import React from 'react';
import Icon from './Icon';

const patientItems = [
  ['dashboard', 'home', 'Overview'],
  ['ai', 'bot', 'AI Health Assistant'],
  ['doctors', 'doctor', 'Find a Doctor'],
  ['appointments', 'calendar', 'Appointments'],
  ['consultations', 'chat', 'My Consultations'],
  ['documents', 'file', 'Medical Documents'],
];

const doctorItems = [
  ['dashboard', 'home', 'Overview'],
  ['consultations', 'chat', 'Consultations'],
  ['appointments', 'calendar', 'Appointment Requests'],
  ['calendar', 'calendar', 'Calendar'],
  ['management', 'settings', 'Manage Profile'],
  ['availability', 'calendar', 'Availability'],
];

const adminItems = [
  ['dashboard', 'home', 'Overview'],
  ['requests', 'calendar', 'Appointment Requests'],
  ['doctors', 'doctor', 'Doctors'],
  ['patients', 'user', 'Patients'],
  ['consultations', 'chat', 'Consultations'],
  ['payments', 'card', 'Payments'],
];

export default function Sidebar({
  role,
  page,
  setPage,
  mobileOpen = false,
  onClose,
  onLogout,
}) {
  const items =
    role === 'PATIENT'
      ? patientItems
      : role === 'DOCTOR'
        ? doctorItems
        : adminItems;

  const handleNavigation = (nextPage) => {
    setPage(nextPage);
    onClose?.();
  };

  const handleLogout = () => {
    onClose?.();
    onLogout?.();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={
          mobileOpen
            ? 'sidebar mobile-open'
            : 'sidebar'
        }
      >
        <div className="mobile-sidebar-header">
          <span>Menu</span>

          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            ×
          </button>
        </div>

        <div className="side-label">
          WORKSPACE
        </div>

        <nav>
          {items.map(
            ([id, icon, label]) => (
              <button
                type="button"
                key={id}
                className={
                  page === id
                    ? 'side-link active'
                    : 'side-link'
                }
                onClick={() =>
                  handleNavigation(id)
                }
              >
                <Icon name={icon} />
                <span>{label}</span>
              </button>
            )
          )}
        </nav>

        <div className="side-bottom">
          <div className="side-label">
            ACCOUNT
          </div>

          <button
            type="button"
            className={
              page === 'settings'
                ? 'side-link active'
                : 'side-link'
            }
            onClick={() =>
              handleNavigation('settings')
            }
          >
            <Icon name="settings" />
            <span>Settings</span>
          </button>

          <button
            type="button"
            className="side-link sidebar-mobile-logout"
            onClick={handleLogout}
          >
            <span className="sidebar-logout-icon">
              ↪
            </span>
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}