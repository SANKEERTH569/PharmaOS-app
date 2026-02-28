import axios from 'axios';

// In production (Vercel), use the VITE_API_URL env var pointing to Render backend.
// In local dev, fall back to '/api' which goes through Vite's proxy → localhost:3001.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pharma_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear local auth and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pharma_token');
      localStorage.removeItem('pharma_auth');
      window.location.href = '/#/login';
    }
    return Promise.reject(err);
  }
);

export default api;
