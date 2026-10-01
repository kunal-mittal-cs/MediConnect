import React, { useMemo, useState } from 'react';

import api from '../api';

import PageHeader from '../components/PageHeader';
import { toast } from '../utils';

export default function Notifications({
  notifications = [],
  setNotifications,
  onBack,
}) {
  const [markingAll, setMarkingAll] =
    useState(false);

  const items = Array.isArray(notifications)
    ? notifications
    : [];

  const unreadCount = useMemo(
    () =>
      items.filter(
        (notification) =>
          notification?.is_read !== true &&
          notification?.read !== true
      ).length,
    [items]
  );

  const formatDate = (value) => {
    if (!value) {
      return 'Recently';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Recently';
    }

    const now = new Date();

    const diffMs =
      now.getTime() - date.getTime();

    const diffMinutes = Math.floor(
      diffMs / 60000
    );

    if (
      diffMinutes >= 0 &&
      diffMinutes < 1
    ) {
      return 'Just now';
    }

    if (
      diffMinutes >= 1 &&
      diffMinutes < 60
    ) {
      return `${diffMinutes} ${
        diffMinutes === 1
          ? 'minute'
          : 'minutes'
      } ago`;
    }

    const diffHours = Math.floor(
      diffMinutes / 60
    );

    if (
      diffHours >= 1 &&
      diffHours < 24
    ) {
      return `${diffHours} ${
        diffHours === 1
          ? 'hour'
          : 'hours'
      } ago`;
    }

    const diffDays = Math.floor(
      diffHours / 24
    );

    if (
      diffDays >= 1 &&
      diffDays < 7
    ) {
      return `${diffDays} ${
        diffDays === 1
          ? 'day'
          : 'days'
      } ago`;
    }

    return date.toLocaleString(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
    );
  };

  const markAllRead = async () => {
    if (unreadCount === 0) {
      return;
    }

    try {
      setMarkingAll(true);

      await api.put(
        '/notifications/read-all'
      );

      setNotifications?.((current) =>
        Array.isArray(current)
          ? current.map(
              (notification) => ({
                ...notification,
                is_read: true,
                read: true,
              })
            )
          : []
      );

      toast(
        'All notifications marked as read.'
      );
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        'Could not mark notifications as read.';

      toast(message, 'error');
    } finally {
      setMarkingAll(false);
    }
  };

  const markOneRead = async (
    notification
  ) => {
    if (!notification?.id) {
      return;
    }

    if (
      notification.is_read === true ||
      notification.read === true
    ) {
      return;
    }

    try {
      await api.put(
        `/notifications/${notification.id}/read`
      );

      setNotifications?.((current) =>
        Array.isArray(current)
          ? current.map((item) =>
              item.id ===
              notification.id
                ? {
                    ...item,
                    is_read: true,
                    read: true,
                  }
                : item
            )
          : []
      );
    } catch (error) {
      toast(
        'Could not update notification.',
        'error'
      );
    }
  };

  return (
    <div className="notification-page">

      <div className="back-row">
        <button
          type="button"
          className="back-btn"
          onClick={onBack}
        >
          ← Back
        </button>
      </div>


      <PageHeader
        eyebrow="NOTIFICATIONS"
        title="Your updates"
        description={
          unreadCount > 0
            ? `You have ${unreadCount} unread ${
                unreadCount === 1
                  ? 'notification'
                  : 'notifications'
              }.`
            : 'You’re all caught up with your MediConnect updates.'
        }
        action={
          items.length > 0 ? (
            <button
              type="button"
              className="secondary-btn"
              onClick={markAllRead}
              disabled={
                markingAll ||
                unreadCount === 0
              }
            >
              {markingAll
                ? 'Marking as read...'
                : unreadCount > 0
                  ? 'Mark all as read'
                  : 'All caught up'}
            </button>
          ) : null
        }
      />


      {items.length > 0 && (
        <div className="notification-summary">

          <div className="notification-summary-main">

            <div className="notification-summary-icon">
              ✓
            </div>

            <div>
              <strong>
                {unreadCount > 0
                  ? `${unreadCount} unread ${
                      unreadCount === 1
                        ? 'update'
                        : 'updates'
                    }`
                  : 'No unread updates'}
              </strong>

              <span>
                Tap a notification to mark it
                as read.
              </span>
            </div>

          </div>

          <span className="notification-count">
            {items.length}
          </span>

        </div>
      )}


      <div className="notification-list">

        {items.length > 0 ? (

          items.map(
            (notification, index) => {
              const isUnread =
                notification.is_read !==
                  true &&
                notification.read !== true;

              const title =
                notification.title ||
                notification.message ||
                'MediConnect update';

              return (
                <button
                  type="button"
                  className={
                    isUnread
                      ? 'notification-card unread'
                      : 'notification-card'
                  }
                  key={
                    notification.id ||
                    `notification-${index}`
                  }
                  onClick={() =>
                    markOneRead(
                      notification
                    )
                  }
                >

                  <div
                    className={
                      isUnread
                        ? 'notif-icon unread'
                        : 'notif-icon'
                    }
                    aria-hidden="true"
                  >
                    {isUnread ? '!' : '✓'}
                  </div>


                  <div className="notification-content">

                    <div className="notification-title-row">

                      <b>
                        {title}
                      </b>

                      {isUnread && (
                        <span className="notification-new-label">
                          NEW
                        </span>
                      )}

                    </div>


                    {notification.title &&
                      notification.message && (
                        <p>
                          {
                            notification.message
                          }
                        </p>
                      )}


                    <small>
                      {formatDate(
                        notification.created_at
                      )}
                    </small>

                  </div>


                  {isUnread && (
                    <span
                      className="notification-unread-dot"
                      aria-label="Unread"
                    />
                  )}

                </button>
              );
            }
          )

        ) : (

          <div className="notification-empty">

            <div className="notification-empty-icon">
              ✓
            </div>

            <h3>
              You’re all caught up
            </h3>

            <p>
              There are no new notifications
              right now. We’ll show important
              appointment and consultation
              updates here.
            </p>

            <button
              type="button"
              className="secondary-btn"
              onClick={onBack}
            >
              ← Back to dashboard
            </button>

          </div>

        )}

      </div>

    </div>
  );
}