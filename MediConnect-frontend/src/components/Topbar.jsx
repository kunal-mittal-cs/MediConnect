import React from 'react';

import Logo from './Logo';
import Icon from './Icon';
import { initials } from '../utils';

export default function Topbar({
  user,
  onLogout,
  onNotifications,
  onProfile,
  unread = 0,
  onMenuToggle,
  mobileMenuOpen = false,
}) {
  const unreadCount = Math.max(
    0,
    Number(unread) || 0
  );

  return (
    <header className="topbar">

      <button
        type="button"
        className="mobile-menu-btn"
        onClick={onMenuToggle}
        aria-label={
          mobileMenuOpen
            ? 'Close navigation menu'
            : 'Open navigation menu'
        }
        aria-expanded={mobileMenuOpen}
      >
        <span />
        <span />
        <span />
      </button>

      <Logo />

      <div className="top-actions">
        <button
          type="button"
          className="icon-btn"
          onClick={onNotifications}
          aria-label={
            unreadCount > 0
              ? `${unreadCount} unread notifications`
              : 'Notifications'
          }
          title="Notifications"
        >
          <Icon name="bell" />

          {unreadCount > 0 && (
            <i
              className="notif-dot"
              aria-hidden="true"
            >
              {unreadCount > 99
                ? '99+'
                : unreadCount}
            </i>
          )}
        </button>

        <button
          type="button"
          className="user-chip"
          onClick={onProfile}
          title="Open profile"
          aria-label="Open profile"
        >
          <span aria-hidden="true">
            {initials(user?.name)}
          </span>

          <b>
            {user?.name || 'User'}
          </b>
        </button>

        <button
          type="button"
          className="logout"
          onClick={onLogout}
        >
          Log out
        </button>
      </div>
    </header>
  );
}