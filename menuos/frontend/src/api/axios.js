import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 10000,
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('menuos-auth');
  if (token) {
    try {
      const parsed = JSON.parse(token);
      if (parsed.state?.accessToken) {
        config.headers.Authorization = `Bearer ${parsed.state.accessToken}`;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  return config;
});

export default api;
