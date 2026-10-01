import React, {
  useEffect,
  useState,
} from 'react';

import api from '../api';

import PageHeader from '../components/PageHeader';
import { toast } from '../utils';

export default function DoctorRequests() {
  const [items, setItems] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [actingId, setActingId] =
    useState(null);

  const load = async () => {
    setLoading(true);

    try {
      const response = await api.get(
        '/appointment-requests/doctor/my'
      );

      setItems(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id, kind) => {
    if (!id || actingId) {
      return;
    }

    setActingId(id);

    try {
      await api.put(
        `/appointment-requests/${id}/${kind}`
      );

      const actionLabel =
        kind === 'accept'
          ? 'accepted'
          : 'rejected';

      toast(
        `Request ${actionLabel}`
      );

      await load();
    } catch (error) {
      toast(
        error.response?.data?.detail ||
          'Action failed',
        'error'
      );
    } finally {
      setActingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="APPOINTMENT REQUESTS"
        title="Patients requesting your care"
        description="Review assigned requests and accept or reject them."
      />

      {loading ? (
        <div className="loading-card">
          Loading appointment requests…
        </div>
      ) : items.length > 0 ? (
        <div className="stack">
          {items.map((item) => {
            const status = String(
              item.status || 'PENDING'
            ).toUpperCase();

            const isAssigned =
              status === 'ASSIGNED';

            const isActing =
              actingId === item.id;

            return (
              <div
                className="request-card"
                key={item.id}
              >
                <div>
                  <span className="muted">
                    Request #{item.id}
                  </span>

                  <h3>
                    {item.specialization ||
                      'Medical consultation'}
                  </h3>

                  <p>
                    {item.preferred_date ||
                      'Date not specified'}
                    {' · '}
                    {String(
                      item.preferred_time ||
                        ''
                    ).slice(0, 5)}
                  </p>

                  {item.message && (
                    <small>
                      {item.message}
                    </small>
                  )}
                </div>

                <div className="request-actions">
                  <span
                    className={`status ${status.toLowerCase()}`}
                  >
                    {status}
                  </span>

                  {isAssigned && (
                    <>
                      <button
                        type="button"
                        className="primary-btn small"
                        onClick={() =>
                          act(
                            item.id,
                            'accept'
                          )
                        }
                        disabled={
                          actingId !== null
                        }
                      >
                        {isActing
                          ? 'Processing…'
                          : 'Accept'}
                      </button>

                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() =>
                          act(
                            item.id,
                            'reject'
                          )
                        }
                        disabled={
                          actingId !== null
                        }
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-card">
          <h3>
            No assigned requests
          </h3>

          <p>
            New assigned appointment requests
            will appear here.
          </p>
        </div>
      )}
    </div>
  );
}