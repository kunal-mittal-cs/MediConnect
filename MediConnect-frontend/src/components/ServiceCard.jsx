import React from 'react';
import { money } from '../utils';

function formatDuration(service) {
  if (service?.duration_value && service?.duration_unit) {
    const value = Number(service.duration_value);
    const unit = String(service.duration_unit).toLowerCase();

    const label =
      value === 1 ? unit.replace(/s$/, '') : unit;

    return `${value} ${label}`;
  }

  const minutes = Number(service?.duration_minutes) || 30;

  if (minutes >= 1440) {
    const days = minutes / 1440;
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }

  if (minutes >= 60) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }

  return `${minutes} minutes`;
}

export default function ServiceCard({
  service,
  onSelect,
  selectable = false,
}) {
  if (!service) return null;

  const title = service.title || 'Consultation';

  const description =
    service.description ||
    'Professional online healthcare consultation.';

  const price = Number(service.price) || 0;

  const duration = formatDuration(service);

  const serviceType = String(
    service.service_type || 'CONSULTATION'
  )
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const features = [
    service.chat_enabled && {
      icon: '💬',
      label: 'Chat',
    },
    service.video_enabled && {
      icon: '▣',
      label: 'Video',
    },
    service.voice_enabled && {
      icon: '◉',
      label: 'Voice',
    },
    service.document_enabled && {
      icon: '▤',
      label: 'Documents',
    },
  ].filter(Boolean);

  return (
    <article
      className={
        selectable
          ? 'service-card service-card-selectable'
          : 'service-card'
      }
    >
      {/* TOP */}

      <div className="service-card-header">

        <div className="service-card-title">

          <span className="service-type">
            {serviceType}
          </span>

          <h3>
            {title}
          </h3>

        </div>

        <div className="service-price">

          <strong>
            {money(price)}
          </strong>

          <span>
            {duration}
          </span>

        </div>

      </div>


      {/* DESCRIPTION */}

      <p className="service-description">
        {description}
      </p>


      {/* FEATURES */}

      {features.length > 0 && (
        <div className="service-features">

          {features.map((feature) => (
            <span
              className="service-feature"
              key={feature.label}
            >
              <span className="service-feature-icon">
                {feature.icon}
              </span>

              {feature.label}
            </span>
          ))}

        </div>
      )}


      {/* ACTION */}

      {selectable && onSelect && (
        <button
          type="button"
          className="service-select-btn"
          onClick={() => onSelect(service)}
        >
          <span>Select service</span>
          <span className="service-arrow">→</span>
        </button>
      )}

    </article>
  );
}