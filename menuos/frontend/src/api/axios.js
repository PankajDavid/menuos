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

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect to login on protected routes
      const currentPath = window.location.pathname;
      const publicPaths = ['/r/', '/login', '/signup', '/'];
      const isPublicPath = publicPaths.some(path => currentPath.startsWith(path) || currentPath === path);
      
      if (!isPublicPath) {
        // Clear auth and redirect to login
        localStorage.removeItem('menuos-auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
