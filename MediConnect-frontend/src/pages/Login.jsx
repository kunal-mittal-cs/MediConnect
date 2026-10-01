import React, { useState } from 'react';

import api from '../api';
import Logo from '../components/Logo';
import { toast } from '../utils';

export default function Login({
  onBack,
  onSuccess,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      toast(
        'Please enter your email and password',
        'error'
      );
      return;
    }

    setBusy(true);

    try {
      const response = await api.post(
        '/auth/login',
        {
          email: cleanEmail,
          password,
        }
      );

      const token =
        response.data?.access_token;

      if (!token) {
        throw new Error(
          'Login token was not returned'
        );
      }

      localStorage.setItem(
        'access_token',
        token
      );

      toast('Welcome back');

      await onSuccess?.();
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        error.message ||
        'Login failed';

      toast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-side">
        <Logo />

        <span className="eyebrow">
          WELCOME BACK
        </span>

        <h1>
          Your care journey, all in one place.
        </h1>

        <p>
          Find verified doctors, manage
          consultations and keep your healthcare
          conversations organized.
        </p>
      </div>

      <div className="auth-box">
        <button
          type="button"
          className="back-btn"
          onClick={onBack}
          disabled={busy}
        >
          ← Back
        </button>

        <h2>Log in</h2>

        <p className="muted">
          Access your MediConnect account.
        </p>

        <form onSubmit={submit}>
          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              autoComplete="email"
              placeholder="you@example.com"
              disabled={busy}
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={busy}
            />
          </label>

          <button
            type="submit"
            className="primary-btn full"
            disabled={busy}
          >
            {busy
              ? 'Signing in…'
              : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}