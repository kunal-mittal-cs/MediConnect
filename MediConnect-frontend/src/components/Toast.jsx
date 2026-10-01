import React, { useEffect, useRef, useState } from 'react';

export default function Toast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const handleToast = (event) => {
      const detail = event.detail || {};

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setToast({
        message: detail.message || '',
        type: detail.type || 'success',
      });

      timerRef.current = setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, 2800);
    };

    window.addEventListener(
      'mc-toast',
      handleToast
    );

    return () => {
      window.removeEventListener(
        'mc-toast',
        handleToast
      );

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  if (!toast) {
    return null;
  }

  return (
    <div
      className={`toast ${toast.type || ''}`}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>
  );
}