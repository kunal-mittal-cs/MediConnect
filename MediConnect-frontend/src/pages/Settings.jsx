import React, {
  useEffect,
  useState,
} from 'react';

import api from '../api';
import { toast } from '../utils';


export default function Settings({
  user,
  onBack,
  onLogout,
}) {
  const [name, setName] =
    useState(user?.name || '');

  const [email, setEmail] =
    useState(user?.email || '');

  const [currentPassword, setCurrentPassword] =
    useState('');

  const [newPassword, setNewPassword] =
    useState('');

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [savingPassword, setSavingPassword] =
    useState(false);

  const [deactivating, setDeactivating] =
    useState(false);


  // =====================================================
  // PLATFORM SETTINGS
  // =====================================================

  const [platformFeePercent, setPlatformFeePercent] =
    useState('10');

  const [platformFeeCap, setPlatformFeeCap] =
    useState('100');

  const [loadingPlatformSettings, setLoadingPlatformSettings] =
    useState(false);

  const [savingPlatformSettings, setSavingPlatformSettings] =
    useState(false);


  const isAdmin =
    String(
      user?.role || ''
    ).toUpperCase() === 'ADMIN';


  // =====================================================
  // LOAD PLATFORM SETTINGS
  // =====================================================

  const loadPlatformSettings = async () => {
    if (!isAdmin) {
      return;
    }

    try {
      setLoadingPlatformSettings(true);

      const response =
        await api.get('/admin/settings');

      setPlatformFeePercent(
        String(
          response.data?.platform_fee_percent ??
            10
        )
      );

      setPlatformFeeCap(
        String(
          response.data?.platform_fee_cap ??
            100
        )
      );
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        'Could not load platform settings.';

      toast(message, 'error');
    } finally {
      setLoadingPlatformSettings(false);
    }
  };


  useEffect(() => {
    loadPlatformSettings();
  }, [user?.role]);


  // =====================================================
  // UPDATE PROFILE
  // =====================================================

  const updateProfile = async (event) => {
    event.preventDefault();

    if (name.trim().length < 2) {
      toast(
        'Name must contain at least 2 characters.',
        'error'
      );
      return;
    }

    try {
      setSavingProfile(true);

      await api.put('/auth/profile', {
        name: name.trim(),
        email: email.trim(),
      });

      toast(
        'Profile updated successfully.'
      );
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        'Could not update profile.';

      toast(message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };


  // =====================================================
  // CHANGE PASSWORD
  // =====================================================

  const changePassword = async (event) => {
    event.preventDefault();

    if (
      !currentPassword ||
      !newPassword
    ) {
      toast(
        'Enter both passwords.',
        'error'
      );
      return;
    }

    if (newPassword.length < 6) {
      toast(
        'New password must contain at least 6 characters.',
        'error'
      );
      return;
    }

    if (currentPassword === newPassword) {
      toast(
        'New password must be different from your current password.',
        'error'
      );
      return;
    }

    try {
      setSavingPassword(true);

      await api.put('/auth/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');

      toast(
        'Password changed successfully.'
      );
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        'Could not change password.';

      toast(message, 'error');
    } finally {
      setSavingPassword(false);
    }
  };


  // =====================================================
  // UPDATE PLATFORM SETTINGS
  // =====================================================

  const updatePlatformSettings =
    async (event) => {
      event.preventDefault();

      const feePercent =
        Number(platformFeePercent);

      const feeCap =
        Number(platformFeeCap);

      if (
        !Number.isFinite(feePercent) ||
        feePercent < 0 ||
        feePercent > 100
      ) {
        toast(
          'Platform fee must be between 0% and 100%.',
          'error'
        );
        return;
      }

      if (
        !Number.isFinite(feeCap) ||
        feeCap < 0
      ) {
        toast(
          'Maximum platform fee cannot be negative.',
          'error'
        );
        return;
      }

      try {
        setSavingPlatformSettings(true);

        const response =
          await api.put(
            '/admin/settings',
            {
              platform_fee_percent:
                feePercent,

              platform_fee_cap:
                feeCap,
            }
          );

        setPlatformFeePercent(
          String(
            response.data?.platform_fee_percent ??
              feePercent
          )
        );

        setPlatformFeeCap(
          String(
            response.data?.platform_fee_cap ??
              feeCap
          )
        );

        toast(
          'Platform settings updated successfully.'
        );
      } catch (error) {
        const message =
          error?.response?.data?.detail ||
          'Could not update platform settings.';

        toast(message, 'error');
      } finally {
        setSavingPlatformSettings(false);
      }
    };


  // =====================================================
  // DEACTIVATE ACCOUNT
  // =====================================================

  const deactivateAccount = async () => {
    const confirmed =
      window.confirm(
        'Are you sure you want to deactivate your account?'
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeactivating(true);

      await api.put(
        '/auth/deactivate'
      );

      toast(
        'Account deactivated.'
      );

      setTimeout(() => {
        onLogout?.();
      }, 700);
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        'Could not deactivate account.';

      toast(message, 'error');

      setDeactivating(false);
    }
  };


  const roleLabel =
    String(user?.role || 'USER')
      .toLowerCase()
      .replace(
        /^./,
        (character) =>
          character.toUpperCase()
      );


  const initials =
    user?.name
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) =>
          part[0]?.toUpperCase()
      )
      .join('') || 'U';


  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="settings-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="settings-page-header">

        <div>

          <button
            type="button"
            className="back-btn"
            onClick={onBack}
          >
            ← Back
          </button>

          <div className="settings-heading">

            <span className="section-kicker">
              ACCOUNT
            </span>

            <h1>
              Settings
            </h1>

            <p>
              Manage your profile, security,
              and account preferences.
            </p>

          </div>

        </div>

      </div>


      {/* =================================================
          ACCOUNT SUMMARY
      ================================================= */}

      <section className="settings-account-card">

        <div className="settings-avatar">
          {initials}
        </div>

        <div className="settings-account-info">

          <strong>
            {user?.name || 'User'}
          </strong>

          <span>
            {user?.email || 'No email available'}
          </span>

        </div>

        <div className="settings-account-role">
          {roleLabel}
        </div>

      </section>


      <div className="settings-grid">

        {/* =================================================
            PROFILE
        ================================================= */}

        <section className="settings-card">

          <div className="settings-card-header">

            <div>

              <div className="settings-section-icon">
                👤
              </div>

              <div>

                <h2>
                  Profile information
                </h2>

                <p>
                  Keep your account details up to date.
                </p>

              </div>

            </div>

          </div>


          <form
            onSubmit={updateProfile}
            className="settings-form"
          >

            <label>
              <span>Full name</span>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                placeholder="Enter your full name"
                required
                minLength={2}
              />
            </label>


            <label>
              <span>Email address</span>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="Enter your email"
                required
              />
            </label>


            <div className="settings-readonly">

              <span>
                Account type
              </span>

              <strong>
                {roleLabel}
              </strong>

            </div>


            <div className="settings-form-footer">

              <small>
                Changes are saved to your MediConnect account.
              </small>

              <button
                type="submit"
                className="primary-btn"
                disabled={savingProfile}
              >
                {savingProfile
                  ? 'Saving...'
                  : 'Save changes'}
              </button>

            </div>

          </form>

        </section>


        {/* =================================================
            PASSWORD
        ================================================= */}

        <section className="settings-card">

          <div className="settings-card-header">

            <div>

              <div className="settings-section-icon">
                🔒
              </div>

              <div>

                <h2>
                  Password & security
                </h2>

                <p>
                  Update your password to keep your account secure.
                </p>

              </div>

            </div>

          </div>


          <form
            onSubmit={changePassword}
            className="settings-form"
          >

            <label>
              <span>Current password</span>

              <input
                type="password"
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(
                    event.target.value
                  )
                }
                placeholder="Enter current password"
                required
              />
            </label>


            <label>
              <span>New password</span>

              <input
                type="password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(
                    event.target.value
                  )
                }
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </label>


            <div className="settings-security-note">
              <span>✓</span>

              <p>
                Use a password that is at least
                6 characters long and different
                from your current password.
              </p>
            </div>


            <div className="settings-form-footer">

              <span />

              <button
                type="submit"
                className="primary-btn"
                disabled={savingPassword}
              >
                {savingPassword
                  ? 'Updating...'
                  : 'Change password'}
              </button>

            </div>

          </form>

        </section>


        {/* =================================================
            PLATFORM SETTINGS
        ================================================= */}

        {isAdmin && (

          <section className="settings-card settings-admin-card">

            <div className="settings-card-header">

              <div>

                <div className="settings-section-icon admin">
                  ⚙
                </div>

                <div>

                  <h2>
                    Platform settings
                  </h2>

                  <p>
                    Configure the fee applied to successful bookings.
                  </p>

                </div>

              </div>

              <span className="settings-admin-badge">
                ADMIN
              </span>

            </div>


            <form
              onSubmit={
                updatePlatformSettings
              }
              className="settings-form"
            >

              <div className="settings-field-grid">

                <label>
                  <span>
                    Platform fee
                  </span>

                  <div className="settings-input-suffix">

                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={
                        platformFeePercent
                      }
                      onChange={(event) =>
                        setPlatformFeePercent(
                          event.target.value
                        )
                      }
                      disabled={
                        loadingPlatformSettings ||
                        savingPlatformSettings
                      }
                      required
                    />

                    <span>%</span>

                  </div>

                </label>


                <label>
                  <span>
                    Maximum fee
                  </span>

                  <div className="settings-input-suffix">

                    <span>
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        platformFeeCap
                      }
                      onChange={(event) =>
                        setPlatformFeeCap(
                          event.target.value
                        )
                      }
                      disabled={
                        loadingPlatformSettings ||
                        savingPlatformSettings
                      }
                      required
                    />

                  </div>

                </label>

              </div>


              <div className="settings-rule-card">

                <div>

                  <span>
                    Current booking rule
                  </span>

                  <strong>
                    {platformFeePercent || '0'}%
                    {' · '}
                    Maximum ₹
                    {platformFeeCap || '0'}
                  </strong>

                </div>

                <span className="settings-rule-status">
                  Active
                </span>

              </div>


              <div className="settings-form-footer">

                <small>
                  Applied to successful paid bookings.
                </small>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={
                    loadingPlatformSettings ||
                    savingPlatformSettings
                  }
                >
                  {loadingPlatformSettings
                    ? 'Loading...'
                    : savingPlatformSettings
                      ? 'Saving...'
                      : 'Save platform settings'}
                </button>

              </div>

            </form>

          </section>

        )}


        {/* =================================================
            DANGER ZONE
        ================================================= */}

        <section className="settings-card danger-card">

          <div className="settings-card-header">

            <div>

              <div className="settings-section-icon danger">
                !
              </div>

              <div>

                <h2>
                  Danger zone
                </h2>

                <p>
                  Permanently deactivate your MediConnect account.
                </p>

              </div>

            </div>

          </div>


          <div className="danger-content">

            <div>

              <strong>
                Deactivate account
              </strong>

              <p>
                You will be signed out and your account
                will no longer be active.
              </p>

            </div>

            <button
              type="button"
              className="danger-btn"
              onClick={
                deactivateAccount
              }
              disabled={deactivating}
            >
              {deactivating
                ? 'Deactivating...'
                : 'Deactivate account'}
            </button>

          </div>

        </section>

      </div>

    </div>
  );
}