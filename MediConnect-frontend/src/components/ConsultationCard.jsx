import React from 'react';

import { dateTime } from '../utils';

export default function ConsultationCard({
  item,
  onOpen,
}) {
  if (!item) {
    return null;
  }

  const status = String(
    item.status || 'PENDING'
  ).toUpperCase();

  const statusClass = status.toLowerCase();

  const title =
    item.service_title ||
    item.title ||
    'Medical Consultation';

  return (
    <article className="consult-card">
      <div className="consult-main">
        <div
          className="consult-avatar"
          aria-hidden="true"
        >
          +
        </div>

        <div>
          <span className="muted">
            Consultation #{item.id}
          </span>

          <h3>{title}</h3>

          <p>
            {dateTime(item.scheduled_at)}
          </p>
        </div>
      </div>

      <div className="consult-right">
        <span
          className={`status ${statusClass}`}
        >
          {status}
        </span>

        <button
          type="button"
          className="ghost-btn"
          onClick={() => onOpen?.(item)}
        >
          Open
        </button>
      </div>
    </article>
  );
}