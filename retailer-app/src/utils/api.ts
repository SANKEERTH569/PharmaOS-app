import axios from 'axios';

// For the mobile app, use the absolute backend URL
// Production: deployed Render backend
const API_BASE_URL = 'https://pharmaos-app.onrender.com/api';

const api = axios.create({
    baseURL: API_BASE_URL,
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
            const isAuthEndpoint = err.config?.url?.includes('/auth/login') || err.config?.url?.includes('/auth/admin/login');
            if (!isAuthEndpoint) {
                localStorage.removeItem('pharma_token');
                localStorage.removeItem('pharma_auth');
                window.location.href = '/#/login';
            }
        }
        return Promise.reject(err);
    }
);

export default api;
