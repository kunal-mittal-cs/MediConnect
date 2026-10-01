import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import api from './api';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';

import Toast from './components/Toast';
import ConsultationRoom from './pages/ConsultationRoom';
import Notifications from './pages/Notifications';
import Booking from './pages/Booking';

import './styles/app.css';


export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [auth, setAuth] = useState('landing');
  const [page, setPage] = useState('dashboard');

  const [selected, setSelected] = useState(null);

  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);


  /*
   * Load currently logged-in user
   */
  const loadUser = useCallback(
    async () => {
      const token =
        localStorage.getItem(
          'access_token'
        );

      if (!token) {
        setUser(null);
        setLoading(false);
        return null;
      }

      try {
        const response =
          await api.get('/auth/me');

        setUser(response.data);

        return response.data;
      } catch (error) {
        localStorage.removeItem(
          'access_token'
        );

        setUser(null);

        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );


  /*
   * Check existing login when app starts
   */
  useEffect(() => {
    loadUser();
  }, [loadUser]);


  /*
   * Load notifications
   */
  const loadNotifications =
    useCallback(
      async () => {
        if (!user) {
          setNotifs([]);
          setUnread(0);
          return;
        }

        try {
          const [
            notificationsResponse,
            unreadResponse,
          ] = await Promise.all([
            api.get('/notifications/'),
            api.get(
              '/notifications/unread-count'
            ),
          ]);

          const notifications =
            Array.isArray(
              notificationsResponse.data
            )
              ? notificationsResponse.data
              : [];

          setNotifs(notifications);

          setUnread(
            Math.max(
              0,
              Number(
                unreadResponse.data?.count
              ) || 0
            )
          );
        } catch (error) {
          /*
           * Keep existing notifications
           * if the request temporarily fails.
           */
        }
      },
      [user]
    );


  useEffect(() => {
    loadNotifications();
  }, [
    loadNotifications,
    page,
  ]);


  /*
   * Refresh notification count
   * every 15 seconds.
   */
  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const interval = setInterval(
      () => {
        loadNotifications();
      },
      15000
    );

    return () =>
      clearInterval(interval);
  }, [
    user,
    loadNotifications,
  ]);


  /*
   * Toast event listener
   */
  useEffect(() => {
    const handleToast = () => {
      /*
       * Toast.jsx handles the actual
       * toast display.
       */
    };

    window.addEventListener(
      'mc-toast',
      handleToast
    );

    return () =>
      window.removeEventListener(
        'mc-toast',
        handleToast
      );
  }, []);


  /*
   * LOGIN SUCCESS
   *
   * Login.jsx saves the access token and
   * calls onSuccess().
   *
   * We then immediately load /auth/me,
   * update user state and open the dashboard.
   */
  const login = async () => {
    setPage('dashboard');
    setSelected(null);
    setUnread(0);
    setNotifs([]);

    const loggedInUser =
      await loadUser();

    if (loggedInUser) {
      setAuth('landing');
    }

    return loggedInUser;
  };


  /*
   * LOGOUT
   */
  const logout = () => {
    localStorage.removeItem(
      'access_token'
    );

    setUser(null);
    setNotifs([]);
    setUnread(0);

    setSelected(null);
    setPage('dashboard');
    setAuth('landing');
  };


  /*
   * Dashboard/page navigation
   *
   * This function changes both:
   * - current page
   * - selected page data
   *
   * This is important for Booking because
   * Booking needs the doctor object.
   */
  const open = (
    nextPage,
    data = null
  ) => {
    setSelected(data);
    setPage(nextPage);
  };


  /*
   * Initial loading
   */
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <h2>MediConnect</h2>

          <p>
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }


  /*
   * PUBLIC / AUTHENTICATION PAGES
   */
  if (!user) {

    /*
     * LOGIN
     */
    if (auth === 'login') {
      return (
        <>
          <Login
            onSuccess={login}
            onBack={() =>
              setAuth('landing')
            }
          />

          <Toast />
        </>
      );
    }


    /*
     * REGISTER
     */
    if (auth === 'register') {
      return (
        <>
          <Register
            onSuccess={login}
            onBack={() =>
              setAuth('landing')
            }
          />

          <Toast />
        </>
      );
    }


    /*
     * LANDING
     */
    return (
      <>
        <Landing
          onLogin={() =>
            setAuth('login')
          }
          onRegister={() =>
            setAuth('register')
          }
        />

        <Toast />
      </>
    );
  }


  /*
   * NOTIFICATIONS
   */
  if (page === 'notifications') {
    return (
      <>
        <Notifications
          user={user}
          notifications={notifs}
          setNotifications={setNotifs}
          onBack={() => {
            setPage('dashboard');

            loadNotifications();
          }}
        />

        <Toast />
      </>
    );
  }


  /*
   * =====================================================
   * CONSULTATION ROOM
   * =====================================================
   *
   * This is used for:
   *
   * 1. AI Free Chat
   * 2. Extended Chat
   * 3. Normal consultations
   *
   * Book Consultation from the AI free-chat
   * limit screen sends the doctor here.
   */
  if (page === 'room') {
    return (
      <>
        <ConsultationRoom
          user={user}
          consultation={selected}

          onBack={() => {
            setPage('consultations');
          }}

          /*
           * Open the EXISTING Booking.jsx flow.
           *
           * IMPORTANT:
           * Use open() instead of setPage()
           * because open() stores the doctor
           * information inside selected.
           */
          onBookConsultation={(doctor) => {
            if (!doctor || !doctor.id) {
              console.error(
                'AI booking: doctor is missing',
                doctor
              );
              return;
            }

            console.log(
              'AI FREE CHAT -> BOOKING:',
              doctor
            );

            open('booking', {
              doctor: doctor,
              service: null,
              consultation: selected,
            });
          }}
        />

        <Toast />
      </>
    );
  }


  /*
   * =====================================================
   * BOOKING
   * =====================================================
   *
   * This uses the existing Booking.jsx.
   *
   * It does NOT modify the AI free consultation.
   *
   * Booking creates a NEW consultation through:
   *
   * POST /consultations/
   *
   * Both booking paths use this same component:
   *
   * 1. Find a Doctor → Booking
   * 2. AI Free Chat → Book Consultation → Booking
   *
   * After successful booking/payment,
   * the user goes to My Consultations.
   */
  if (page === 'booking') {
    return (
      <>
        <Booking
          doctor={selected?.doctor}
          service={selected?.service || null}

          /*
           * Return to the previous consultation room
           * when Booking was opened from AI Free Chat.
           *
           * For normal Find a Doctor booking,
           * there is no previous consultation,
           * so return to My Consultations.
           */
          onBack={() => {
            if (selected?.consultation) {
              setPage('room');

              setSelected(
                selected.consultation
              );
            } else {
              setPage('consultations');

              setSelected(null);
            }
          }}

          /*
           * Booking completed.
           *
           * This applies to BOTH:
           *
           * - Find a Doctor booking
           * - AI Free Chat → Book Consultation
           *
           * After free confirmation or successful
           * payment, go directly to My Consultations.
           */
          onDone={(newConsultation) => {
            setSelected(null);

            setPage(
              'consultations'
            );
          }}
        />

        <Toast />
      </>
    );
  }


  /*
   * =====================================================
   * PATIENT DASHBOARD
   * =====================================================
   */
  if (user.role === 'PATIENT') {
    return (
      <>
        <PatientDashboard
          selected={selected}
          user={user}
          onLogout={logout}
          page={page}
          setPage={open}
          onNotifications={() =>
            setPage('notifications')
          }
          unread={unread}
        />

        <Toast />
      </>
    );
  }


  /*
   * =====================================================
   * DOCTOR DASHBOARD
   * =====================================================
   */
  if (user.role === 'DOCTOR') {
    return (
      <>
        <DoctorDashboard
          user={user}
          onLogout={logout}
          page={page}
          setPage={open}
          onNotifications={() =>
            setPage('notifications')
          }
          unread={unread}
        />

        <Toast />
      </>
    );
  }


  /*
   * =====================================================
   * ADMIN DASHBOARD
   * =====================================================
   */
  return (
    <>
      <AdminDashboard
        user={user}
        onLogout={logout}
        page={page}
        setPage={open}
        onNotifications={() =>
          setPage('notifications')
        }
        unread={unread}
      />

      <Toast />
    </>
  );
}