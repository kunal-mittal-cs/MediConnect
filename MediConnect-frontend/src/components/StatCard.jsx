import React from 'react';

export default function StatCard({
  label,
  value,
  meta,
  icon,
}) {
  return (
    <div className="stat-card">
      <div
        className="stat-icon"
        aria-hidden="true"
      >
        {icon}
      </div>

      <div>
        <span>{label}</span>

        <strong>
          {value ?? '—'}
        </strong>

        {meta && (
          <small>
            {meta}
          </small>
        )}
      </div>
    </div>
  );
}