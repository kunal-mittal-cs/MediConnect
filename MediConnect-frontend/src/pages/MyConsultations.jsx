import React from 'react';

import PageHeader from '../components/PageHeader';
import ConsultationCard from '../components/ConsultationCard';

export default function MyConsultations({
  consultations,
  onOpen,
}) {
  const items = Array.isArray(consultations)
    ? consultations
    : [];

  return (
    <div>
      <PageHeader
        eyebrow="CARE HISTORY"
        title="My consultations"
        description="Review previous consultations and continue active conversations."
      />

      <div className="stack">
        {items.length > 0 ? (
          items.map((consultation) => (
            <ConsultationCard
              key={consultation.id}
              item={consultation}
              onOpen={onOpen}
            />
          ))
        ) : (
          <div className="empty-card">
            <h3>
              No consultations yet
            </h3>

            <p>
              Book a verified doctor to start your
              first consultation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}