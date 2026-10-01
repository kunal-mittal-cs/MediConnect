import React, { useState } from 'react';
import { money, toast } from '../utils';
import api from '../api';

export default function PaymentModal({
  consultation,
  service,
  doctor,
  onSuccess,
  onClose,
  isUpgrade = false,
}) {
  const [method, setMethod] = useState('UPI');
  const [processing, setProcessing] = useState(false);

  const [upiId, setUpiId] = useState('');

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');

  const [bank, setBank] = useState('');

  const price = Number(service?.price || 0);

  const formatCardNumber = (value) => {
    const digits = value
      .replace(/\D/g, '')
      .slice(0, 16);

    return digits
      .replace(/(.{4})/g, '$1 ')
      .trim();
  };

  const formatExpiry = (value) => {
    const digits = value
      .replace(/\D/g, '')
      .slice(0, 4);

    if (digits.length <= 2) {
      return digits;
    }

    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const validatePayment = () => {
    if (method === 'UPI') {
      if (!upiId.trim()) {
        toast('Enter a UPI ID.', 'error');
        return false;
      }

      return true;
    }

    if (method === 'CARD') {
      if (
        cardNumber.replace(/\s/g, '').length !== 16
      ) {
        toast(
          'Enter a valid 16-digit card number.',
          'error'
        );
        return false;
      }

      if (expiry.length !== 5) {
        toast(
          'Enter a valid expiry date.',
          'error'
        );
        return false;
      }

      if (cvv.length !== 3) {
        toast(
          'Enter a valid CVV.',
          'error'
        );
        return false;
      }

      if (!cardName.trim()) {
        toast(
          'Enter the name on the card.',
          'error'
        );
        return false;
      }

      return true;
    }

    if (method === 'NETBANKING') {
      if (!bank) {
        toast(
          'Select your bank.',
          'error'
        );
        return false;
      }

      return true;
    }

    return true;
  };

  const handlePayment = async () => {
    if (!consultation?.id) {
      toast(
        'Consultation information is missing.',
        'error'
      );
      return;
    }

    if (!service?.id) {
      toast(
        'Payment service information is missing.',
        'error'
      );
      return;
    }

    if (price <= 0) {
      toast(
        'This service does not require a paid checkout.',
        'error'
      );
      return;
    }

    if (!validatePayment()) {
      return;
    }

    setProcessing(true);

    try {
      /*
       * DEMO PAYMENT
       *
       * Normal booking:
       *   payment is created for the consultation's
       *   existing service.
       *
       * AI free-chat upgrade:
       *   upgrade_service_id tells the backend to
       *   upgrade THIS SAME consultation to the
       *   selected paid service.
       */

      const response = await api.post(
        `/consultations/${consultation.id}/payment`,
        {
          payment_method: method,
          simulate_success: true,

          ...(isUpgrade
            ? {
                upgrade_service_id: service.id,
              }
            : {}),
        }
      );

      toast(
        isUpgrade
          ? 'Payment successful. Your consultation has been upgraded.'
          : 'Payment successful. Consultation confirmed.',
        'success'
      );

      onSuccess?.(
        response.data || consultation
      );

    } catch (error) {
      console.error(
        'Payment error:',
        error
      );

      toast(
        error.response?.data?.detail ||
          'Payment failed. Please try again.',
        'error'
      );

    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="payment-modal-overlay">

      <div className="payment-modal">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="payment-modal-header">

          <div>

            <span className="section-kicker">
              {isUpgrade
                ? 'CONTINUE CONSULTATION'
                : 'SECURE CHECKOUT'}
            </span>

            <h2>
              {isUpgrade
                ? 'Continue consultation'
                : 'Complete payment'}
            </h2>

            <p>
              {isUpgrade
                ? 'Complete payment to continue chatting with this doctor.'
                : 'Securely confirm your consultation.'}
            </p>

          </div>

          <button
            type="button"
            className="payment-close-btn"
            onClick={onClose}
            disabled={processing}
          >
            ×
          </button>

        </div>


        {/* ======================================================
            ORDER SUMMARY
        ====================================================== */}

        <div className="payment-order-summary">

          <div className="payment-doctor">

            <div className="payment-doctor-avatar">

              {(doctor?.name || 'D')
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}

            </div>

            <div>

              <strong>
                {doctor?.name || 'Doctor'}
              </strong>

              <span>
                {doctor?.specialization ||
                  'Healthcare professional'}
              </span>

            </div>

          </div>


          <div className="payment-service-row">

            <div>

              <strong>
                {service?.title}
              </strong>

              <span>
                {isUpgrade
                  ? 'Paid consultation upgrade'
                  : 'Consultation service'}
              </span>

            </div>

            <strong>
              {money(price)}
            </strong>

          </div>

        </div>


        {/* ======================================================
            PAYMENT METHODS
        ====================================================== */}

        <div className="payment-section">

          <div className="payment-section-title">

            <h3>
              Choose payment method
            </h3>

            <span>
              Demo checkout
            </span>

          </div>


          <div className="payment-methods">

            {/* UPI */}

            <button
              type="button"
              className={
                method === 'UPI'
                  ? 'payment-method active'
                  : 'payment-method'
              }
              onClick={() =>
                setMethod('UPI')
              }
              disabled={processing}
            >

              <span className="payment-method-icon">
                U
              </span>

              <span>
                <strong>UPI</strong>
                <small>
                  GPay, PhonePe, Paytm
                </small>
              </span>

              <span className="payment-radio">
                {method === 'UPI'
                  ? '✓'
                  : ''}
              </span>

            </button>


            {/* CARD */}

            <button
              type="button"
              className={
                method === 'CARD'
                  ? 'payment-method active'
                  : 'payment-method'
              }
              onClick={() =>
                setMethod('CARD')
              }
              disabled={processing}
            >

              <span className="payment-method-icon">
                ▣
              </span>

              <span>
                <strong>Card</strong>
                <small>
                  Credit or debit card
                </small>
              </span>

              <span className="payment-radio">
                {method === 'CARD'
                  ? '✓'
                  : ''}
              </span>

            </button>


            {/* NET BANKING */}

            <button
              type="button"
              className={
                method === 'NETBANKING'
                  ? 'payment-method active'
                  : 'payment-method'
              }
              onClick={() =>
                setMethod('NETBANKING')
              }
              disabled={processing}
            >

              <span className="payment-method-icon">
                ▤
              </span>

              <span>
                <strong>
                  Net Banking
                </strong>

                <small>
                  All major banks
                </small>
              </span>

              <span className="payment-radio">
                {method === 'NETBANKING'
                  ? '✓'
                  : ''}
              </span>

            </button>


            {/* TEST */}

            <button
              type="button"
              className={
                method === 'TEST'
                  ? 'payment-method active'
                  : 'payment-method'
              }
              onClick={() =>
                setMethod('TEST')
              }
              disabled={processing}
            >

              <span className="payment-method-icon">
                ✓
              </span>

              <span>
                <strong>
                  Test Payment
                </strong>

                <small>
                  Demo / no real money
                </small>
              </span>

              <span className="payment-radio">
                {method === 'TEST'
                  ? '✓'
                  : ''}
              </span>

            </button>

          </div>

        </div>


        {/* ======================================================
            PAYMENT FORM
        ====================================================== */}

        <div className="payment-form">

          {/* UPI */}

          {method === 'UPI' && (

            <div className="payment-input-group">

              <label>
                UPI ID
              </label>

              <input
                type="text"
                placeholder="example@upi"
                value={upiId}
                onChange={(event) =>
                  setUpiId(
                    event.target.value
                  )
                }
                disabled={processing}
              />

              <small>
                Enter any dummy UPI ID for this demo.
              </small>

            </div>

          )}


          {/* CARD */}

          {method === 'CARD' && (

            <>

              <div className="payment-input-group">

                <label>
                  Card number
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(event) =>
                    setCardNumber(
                      formatCardNumber(
                        event.target.value
                      )
                    )
                  }
                  disabled={processing}
                />

              </div>


              <div className="payment-form-row">

                <div className="payment-input-group">

                  <label>
                    Expiry
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(event) =>
                      setExpiry(
                        formatExpiry(
                          event.target.value
                        )
                      )
                    }
                    disabled={processing}
                  />

                </div>


                <div className="payment-input-group">

                  <label>
                    CVV
                  </label>

                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={3}
                    placeholder="•••"
                    value={cvv}
                    onChange={(event) =>
                      setCvv(
                        event.target.value
                          .replace(/\D/g, '')
                          .slice(0, 3)
                      )
                    }
                    disabled={processing}
                  />

                </div>

              </div>


              <div className="payment-input-group">

                <label>
                  Name on card
                </label>

                <input
                  type="text"
                  placeholder="Cardholder name"
                  value={cardName}
                  onChange={(event) =>
                    setCardName(
                      event.target.value
                    )
                  }
                  disabled={processing}
                />

              </div>

            </>

          )}


          {/* NET BANKING */}

          {method === 'NETBANKING' && (

            <div className="payment-input-group">

              <label>
                Select your bank
              </label>

              <select
                value={bank}
                onChange={(event) =>
                  setBank(event.target.value)
                }
                disabled={processing}
              >

                <option value="">
                  Choose bank
                </option>

                <option value="HDFC">
                  HDFC Bank
                </option>

                <option value="ICICI">
                  ICICI Bank
                </option>

                <option value="SBI">
                  State Bank of India
                </option>

                <option value="AXIS">
                  Axis Bank
                </option>

                <option value="KOTAK">
                  Kotak Mahindra Bank
                </option>

              </select>

            </div>

          )}


          {/* TEST PAYMENT */}

          {method === 'TEST' && (

            <div className="demo-payment-notice">

              <div className="demo-payment-icon">
                ✓
              </div>

              <div>

                <strong>
                  Test payment mode
                </strong>

                <p>
                  No real payment will be processed.
                  This will immediately simulate a
                  successful transaction.
                </p>

              </div>

            </div>

          )}

        </div>


        {/* ======================================================
            TOTAL
        ====================================================== */}

        <div className="payment-total">

          <span>
            Total payable
          </span>

          <strong>
            {money(price)}
          </strong>

        </div>


        {/* ======================================================
            PAY BUTTON
        ====================================================== */}

        <button
          type="button"
          className="payment-pay-btn"
          onClick={handlePayment}
          disabled={processing}
        >

          {processing
            ? 'Processing payment...'
            : `Pay ${money(price)}`}

        </button>


        {/* ======================================================
            SECURITY
        ====================================================== */}

        <div className="payment-security">

          <span>
            🔒
          </span>

          <span>
            Demo checkout • No real money involved
          </span>

        </div>

      </div>

    </div>
  );
}