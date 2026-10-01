import React, { useState } from 'react';

import api from '../api';
import Logo from '../components/Logo';
import { toast } from '../utils';

export default function Register({
  onBack,
  onSuccess,
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'PATIENT',
  });

  const [busy, setBusy] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();

    if (!name || !email || !form.password) {
      toast(
        'Please complete all required fields',
        'error'
      );
      return;
    }

    if (form.password.length < 6) {
      toast(
        'Password must be at least 6 characters',
        'error'
      );
      return;
    }

    setBusy(true);

    try {
      const response = await api.post(
        '/auth/register',
        {
          name,
          email,
          password: form.password,
          role: form.role,
        }
      );

      const token =
        response.data?.access_token;

      if (!token) {
        throw new Error(
          'Registration token was not returned'
        );
      }

      /*
       * Save the token immediately.
       * The user is now logged in.
       */
      localStorage.setItem(
        'access_token',
        token
      );

      toast(
        'Account created successfully'
      );

      /*
       * Load the logged-in user and
       * open the correct dashboard.
       */
      await onSuccess?.();

    } catch (error) {
      const message =
        error.response?.data?.detail ||
        error.message ||
        'Registration failed';

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
          JOIN MEDICONNECT
        </span>

        <h1>
          Healthcare access, without the friction.
        </h1>

        <p>
          Create a patient or doctor account and
          start using the platform.
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

        <h2>Create account</h2>

        <p className="muted">
          Your role determines your workspace.
        </p>

        <form onSubmit={submit}>
          <label>
            Full name

            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                updateField(
                  'name',
                  event.target.value
                )
              }
              required
              autoComplete="name"
              placeholder="Your full name"
              disabled={busy}
            />
          </label>

          <label>
            Email

            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                updateField(
                  'email',
                  event.target.value
                )
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
              minLength={6}
              value={form.password}
              onChange={(event) =>
                updateField(
                  'password',
                  event.target.value
                )
              }
              required
              autoComplete="new-password"
              placeholder="At least 6 characters"
              disabled={busy}
            />
          </label>

          <div className="role-toggle">
            <button
              type="button"
              className={
                form.role === 'PATIENT'
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                updateField(
                  'role',
                  'PATIENT'
                )
              }
              disabled={busy}
              aria-pressed={
                form.role === 'PATIENT'
              }
            >
              Patient
            </button>

            <button
              type="button"
              className={
                form.role === 'DOCTOR'
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                updateField(
                  'role',
                  'DOCTOR'
                )
              }
              disabled={busy}
              aria-pressed={
                form.role === 'DOCTOR'
              }
            >
              Doctor
            </button>
          </div>

          <button
            type="submit"
            className="primary-btn full"
            disabled={busy}
          >
            {busy
              ? 'Creating…'
              : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}