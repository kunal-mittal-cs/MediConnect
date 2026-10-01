import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Let Axios/browser set the correct multipart boundary for FormData.
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the backend says the session is no longer valid,
    // remove the token so the app can return to the login flow.
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
    }

    return Promise.reject(error);
  }
);

export default api;