import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 10000,
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  // Get token from localStorage (Zustand persist storage)
  const token = localStorage.getItem('menuos-auth');
  if (token) {
    try {
      const parsed = JSON.parse(token);
      // Handle both Zustand persist format and direct format
      const accessToken = parsed.state?.accessToken || parsed.accessToken;
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
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
      // Public paths that don't require auth
      const publicPaths = ['/login', '/signup', '/'];
      // Customer-facing menu paths like /r/:slug/menu are public
      // But /r/:slug/admin, /r/:slug/kitchen are protected
      const isPublicPath = publicPaths.some(path => currentPath === path) || 
                           /^\/r\/[^\/]+\/menu/.test(currentPath) ||
                           /^\/r\/[^\/]+\/checkout/.test(currentPath) ||
                           /^\/r\/[^\/]+\/order-confirm/.test(currentPath);
      
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
