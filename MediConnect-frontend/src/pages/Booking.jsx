import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import api from '../api';
import ServiceCard from '../components/ServiceCard';
import PaymentModal from './PaymentModal';
import { money, toast } from '../utils';

function formatDuration(service) {
  if (
    service?.duration_value &&
    service?.duration_unit
  ) {
    const value = Number(
      service.duration_value
    );

    const unit = String(
      service.duration_unit
    ).toLowerCase();

    const label =
      value === 1
        ? unit.replace(/s$/, '')
        : unit;

    return `${value} ${label}`;
  }

  const minutes =
    Number(
      service?.duration_minutes
    ) || 30;

  if (minutes >= 1440) {
    const days = minutes / 1440;

    return `${days} ${
      days === 1 ? 'day' : 'days'
    }`;
  }

  if (minutes >= 60) {
    const hours = minutes / 60;

    return `${hours} ${
      hours === 1 ? 'hour' : 'hours'
    }`;
  }

  return `${minutes} minutes`;
}

function formatSelectedDate(date) {
  if (!date) {
    return '';
  }

  const parsed = new Date(
    `${date}T00:00:00`
  );

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString(
    'en-IN',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  );
}

export default function Booking({
  doctor,
  service: initialService,
  onBack,
  onDone,
}) {
  /* =====================================================
     SERVICES
     ===================================================== */

  const [services, setServices] =
    useState([]);

  const [servicesLoading, setServicesLoading] =
    useState(true);

  const [service, setService] =
    useState(
      initialService || null
    );

  /* =====================================================
     DATE / TIME
     ===================================================== */

  const [date, setDate] =
    useState('');

  const [slots, setSlots] =
    useState([]);

  const [selectedSlot, setSelectedSlot] =
    useState(null);

  const [loadingSlots, setLoadingSlots] =
    useState(false);

  /* =====================================================
     CONSULTATION
     ===================================================== */

  const [creating, setCreating] =
    useState(false);

  const [consultation, setConsultation] =
    useState(null);

  /* =====================================================
     PAYMENT
     ===================================================== */

  const [showPayment, setShowPayment] =
    useState(false);

  /* =====================================================
     STEP

     1 = Service
     2 = Date & Time
     3 = Payment
     ===================================================== */

  const [step, setStep] =
    useState(
      initialService ? 2 : 1
    );

  /* =====================================================
     MINIMUM DATE
     ===================================================== */

  const minDate = useMemo(() => {
    const now = new Date();

    const year =
      now.getFullYear();

    const month = String(
      now.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      now.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }, []);

  /* =====================================================
     LOAD DOCTOR SERVICES
     ===================================================== */

  useEffect(() => {
    if (!doctor?.id) {
      setServices([]);
      setServicesLoading(false);
      return;
    }

    let cancelled = false;

    const loadServices = async () => {
      setServicesLoading(true);

      try {
        const response =
          await api.get(
            '/doctors/services',
            {
              params: {
                doctor_id:
                  doctor.id,
              },
            }
          );

        if (cancelled) {
          return;
        }

        const activeServices =
          Array.isArray(
            response.data
          )
            ? response.data.filter(
                (item) =>
                  item.is_active !==
                  false
              )
            : [];

        setServices(
          activeServices
        );

        if (initialService?.id) {
          const existing =
            activeServices.find(
              (item) =>
                item.id ===
                initialService.id
            );

          if (existing) {
            setService(existing);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setServices([]);

          toast(
            error.response?.data
              ?.detail ||
              'Could not load consultation services.',
            'error'
          );
        }
      } finally {
        if (!cancelled) {
          setServicesLoading(false);
        }
      }
    };

    loadServices();

    return () => {
      cancelled = true;
    };
  }, [
    doctor?.id,
    initialService?.id,
  ]);

  /* =====================================================
     LOAD AVAILABLE SLOTS
     ===================================================== */

  useEffect(() => {
    setSlots([]);
    setSelectedSlot(null);

    if (
      !doctor?.id ||
      !service?.id ||
      !date
    ) {
      return;
    }

    let cancelled = false;

    const loadSlots = async () => {
      setLoadingSlots(true);

      try {
        const response =
          await api.get(
            `/doctors/${doctor.id}/available-slots`,
            {
              params: {
                date_value: date,
                service_id:
                  service.id,
              },
            }
          );

        if (!cancelled) {
          setSlots(
            Array.isArray(
              response.data
            )
              ? response.data
              : []
          );
        }
      } catch (error) {
        if (!cancelled) {
          setSlots([]);

          toast(
            error.response?.data
              ?.detail ||
              'Could not load available time slots.',
            'error'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      }
    };

    loadSlots();

    return () => {
      cancelled = true;
    };
  }, [
    doctor?.id,
    service?.id,
    date,
  ]);

  /* =====================================================
     SERVICE SELECTION
     ===================================================== */

  const handleServiceSelect = (
    selectedService
  ) => {
    setService(
      selectedService
    );

    setDate('');
    setSlots([]);
    setSelectedSlot(null);
    setConsultation(null);
    setShowPayment(false);

    setStep(2);
  };

  /* =====================================================
     CREATE CONSULTATION
     ===================================================== */

  const createConsultation =
    async () => {
      if (!doctor?.id) {
        toast(
          'Doctor information is missing.',
          'error'
        );
        return;
      }

      if (!service?.id) {
        toast(
          'Please select a consultation service.',
          'error'
        );
        return;
      }

      if (!date || !selectedSlot) {
        toast(
          'Please select a date and available time.',
          'error'
        );
        return;
      }

      setCreating(true);

      try {
        const response =
          await api.post(
            '/consultations/',
            {
              doctor_id:
                doctor.id,

              service_id:
                service.id,

              scheduled_at:
                `${date}T${selectedSlot.start_time}`,
            }
          );

        const createdConsultation =
          response.data;

        setConsultation(
          createdConsultation
        );

        if (
          Number(
            service.price || 0
          ) <= 0
        ) {
          toast(
            'Consultation confirmed.'
          );

          onDone?.(
            createdConsultation
          );

          return;
        }

        setShowPayment(true);
        setStep(3);
      } catch (error) {
        toast(
          error.response?.data
            ?.detail ||
            'Could not create consultation.',
          'error'
        );
      } finally {
        setCreating(false);
      }
    };

  /* =====================================================
     PAYMENT SUCCESS
     ===================================================== */

  const handlePaymentSuccess =
    (paidConsultation) => {
      setShowPayment(false);

      toast(
        'Payment successful. Consultation confirmed.'
      );

      onDone?.(
        paidConsultation ||
          consultation
      );
    };

  /* =====================================================
     BACK
     ===================================================== */

  const handleBack = () => {
    if (showPayment) {
      setShowPayment(false);
      return;
    }

    if (step === 3) {
      setConsultation(null);
      setStep(2);
      return;
    }

    if (step === 2) {
      setService(null);
      setDate('');
      setSlots([]);
      setSelectedSlot(null);
      setConsultation(null);
      setStep(1);
      return;
    }

    onBack?.();
  };

  /* =====================================================
     DOCTOR MISSING
     ===================================================== */

  if (!doctor) {
    return (
      <div className="empty-card">
        <h3>
          Doctor information unavailable
        </h3>

        <p>
          Please return to Find Doctors
          and select a doctor again.
        </p>

        <button
          type="button"
          className="secondary-btn"
          onClick={onBack}
        >
          ← Back to doctors
        </button>
      </div>
    );
  }

  return (
    <div className="booking-page">

      {/* =================================================
          HEADER
          ================================================= */}

      <div className="booking-header">

        <button
          type="button"
          className="back-btn"
          onClick={handleBack}
        >
          ← Back
        </button>

        <div className="booking-heading-content">

          <span className="section-kicker">
            BOOK CONSULTATION
          </span>

          <h1>
            Book a consultation with{' '}
            {doctor.name}
          </h1>

          <div className="booking-doctor-meta">
            <span>
              {doctor.specialization ||
                'Healthcare specialist'}
            </span>

            {doctor.qualification && (
              <>
                <span className="booking-meta-dot">
                  •
                </span>

                <span>
                  {doctor.qualification}
                </span>
              </>
            )}
          </div>

        </div>

      </div>


      {/* =================================================
          PROGRESS
          ================================================= */}

      <div className="booking-progress">

        <div
          className={
            step >= 1
              ? 'booking-progress-item active'
              : 'booking-progress-item'
          }
        >
          <span>1</span>

          <div>
            <strong>
              Service
            </strong>

            <small>
              Choose consultation
            </small>
          </div>
        </div>


        <div className="booking-progress-line" />


        <div
          className={
            step >= 2
              ? 'booking-progress-item active'
              : 'booking-progress-item'
          }
        >
          <span>2</span>

          <div>
            <strong>
              Date & time
            </strong>

            <small>
              Choose your slot
            </small>
          </div>
        </div>


        <div className="booking-progress-line" />


        <div
          className={
            step >= 3
              ? 'booking-progress-item active'
              : 'booking-progress-item'
          }
        >
          <span>3</span>

          <div>
            <strong>
              Payment
            </strong>

            <small>
              Confirm booking
            </small>
          </div>
        </div>

      </div>


      {/* =================================================
          STEP 1 — SERVICE
          ================================================= */}

      {step === 1 && (
        <section className="booking-section">

          <div className="booking-section-heading">

            <span className="section-kicker">
              STEP 1 OF 3
            </span>

            <h2>
              What kind of consultation do you need?
            </h2>

            <p>
              Choose the consultation service
              that best matches your needs.
            </p>

          </div>


          {servicesLoading ? (
            <div className="loading-card">
              Loading available services...
            </div>
          ) : services.length > 0 ? (
            <div className="booking-service-grid">

              {services.map((item) => (
                <ServiceCard
                  key={item.id}
                  service={item}
                  selectable={true}
                  onSelect={
                    handleServiceSelect
                  }
                />
              ))}

            </div>
          ) : (
            <div className="empty-card">

              <h3>
                No services available
              </h3>

              <p>
                This doctor has not published
                any active consultation services
                yet.
              </p>

            </div>
          )}

        </section>
      )}


      {/* =================================================
          STEP 2 — DATE & TIME
          ================================================= */}

      {step === 2 && service && (
        <section className="booking-section">

          <div className="booking-section-heading">

            <span className="section-kicker">
              STEP 2 OF 3
            </span>

            <h2>
              When would you like to meet?
            </h2>

            <p>
              Pick a convenient date and one
              of the available consultation times.
            </p>

          </div>


          {/* SELECTED SERVICE */}

          <div className="selected-service-card">

            <div className="selected-service-main">

              <span className="service-type">
                YOUR CONSULTATION
              </span>

              <h3>
                {service.title ||
                  'Consultation'}
              </h3>

              <p>
                {service.description ||
                  'Professional healthcare consultation.'}
              </p>

            </div>

            <div className="selected-service-price">

              <strong>
                {money(service.price)}
              </strong>

              <span>
                {formatDuration(service)}
              </span>

            </div>

          </div>


          {/* DATE */}

          <div className="booking-date-card">

            <div className="booking-field-heading">

              <div>
                <span className="section-kicker">
                  01
                </span>

                <h3>
                  Choose a date
                </h3>

                <p>
                  Select a date that works
                  for you.
                </p>
              </div>

            </div>

            <label
              htmlFor="consultation-date"
              className="booking-date-label"
            >
              Appointment date
            </label>

            <input
              id="consultation-date"
              type="date"
              min={minDate}
              value={date}
              onChange={(event) => {
                setDate(
                  event.target.value
                );

                setSelectedSlot(null);
              }}
            />

            {date && (
              <div className="booking-selected-date">
                <span>
                  Selected date
                </span>

                <strong>
                  {formatSelectedDate(
                    date
                  )}
                </strong>
              </div>
            )}

          </div>


          {/* AVAILABLE SLOTS */}

          {date && (
            <div className="booking-slots-card">

              <div className="slots-heading">

                <div>
                  <span className="section-kicker">
                    02 · AVAILABLE TIMES
                  </span>

                  <h3>
                    Choose an available time
                  </h3>

                  <p>
                    Select one available slot
                    for your consultation.
                  </p>
                </div>

              </div>


              {loadingSlots ? (
                <div className="loading-card">
                  Checking available times...
                </div>
              ) : slots.length > 0 ? (
                <div className="time-slot-grid">

                  {slots.map(
                    (slot, index) => {
                      const selected =
                        selectedSlot?.start_time ===
                        slot.start_time;

                      return (
                        <button
                          key={`${slot.start_time}-${index}`}
                          type="button"
                          className={
                            selected
                              ? 'time-slot selected'
                              : 'time-slot'
                          }
                          onClick={() =>
                            setSelectedSlot(
                              slot
                            )
                          }
                        >
                          <span>
                            {slot.start_time.slice(
                              0,
                              5
                            )}
                          </span>

                          <span className="time-slot-separator">
                            –
                          </span>

                          <span>
                            {slot.end_time.slice(
                              0,
                              5
                            )}
                          </span>
                        </button>
                      );
                    }
                  )}

                </div>
              ) : (
                <div className="empty-inner">

                  <strong>
                    No times available for this date
                  </strong>

                  <p>
                    Try another date to find
                    an available consultation slot.
                  </p>

                </div>
              )}

            </div>
          )}


          {/* ACTIONS */}

          <div className="booking-actions">

            <button
              type="button"
              className="secondary-btn"
              onClick={handleBack}
            >
              ← Change service
            </button>


            <button
              type="button"
              className="primary-btn"
              disabled={
                !date ||
                !selectedSlot ||
                creating
              }
              onClick={
                createConsultation
              }
            >
              {creating
                ? 'Preparing your booking...'
                : Number(
                    service.price || 0
                  ) > 0
                  ? 'Continue to payment →'
                  : 'Confirm consultation →'}
            </button>

          </div>

        </section>
      )}


      {/* =================================================
          STEP 3 — PAYMENT
          ================================================= */}

      {step === 3 &&
        consultation &&
        !showPayment && (
          <section className="booking-section">

            <div className="booking-section-heading">

              <span className="section-kicker">
                STEP 3 OF 3
              </span>

              <h2>
                Review and complete payment
              </h2>

              <p>
                Check your consultation details
                before completing the booking.
              </p>

            </div>


            <div className="payment-summary">

              <div className="payment-summary-row">
                <span>
                  Doctor
                </span>

                <strong>
                  {doctor.name}
                </strong>
              </div>


              <div className="payment-summary-row">
                <span>
                  Service
                </span>

                <strong>
                  {service?.title}
                </strong>
              </div>


              <div className="payment-summary-row">
                <span>
                  Date
                </span>

                <strong>
                  {formatSelectedDate(
                    date
                  )}
                </strong>
              </div>


              <div className="payment-summary-row">
                <span>
                  Time
                </span>

                <strong>
                  {selectedSlot?.start_time?.slice(
                    0,
                    5
                  )}
                  {' – '}
                  {selectedSlot?.end_time?.slice(
                    0,
                    5
                  )}
                </strong>
              </div>


              <div className="payment-summary-row total">

                <span>
                  Total
                </span>

                <strong>
                  {money(
                    service?.price
                  )}
                </strong>

              </div>

            </div>


            <button
              type="button"
              className="primary-btn full"
              onClick={() =>
                setShowPayment(true)
              }
            >
              Proceed to payment →
            </button>

          </section>
        )}


      {/* =================================================
          PAYMENT MODAL
          ================================================= */}

      {showPayment &&
        consultation &&
        service && (
          <PaymentModal
            consultation={
              consultation
            }
            service={service}
            doctor={doctor}
            onClose={() =>
              setShowPayment(false)
            }
            onSuccess={
              handlePaymentSuccess
            }
          />
        )}

    </div>
  );
}