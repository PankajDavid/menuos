import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios.js';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      },

      setUser: (user) => set({ user }),

      login: async (email, password) => {
        const res = await api.post('/api/auth/login', { email, password });
        const { accessToken, refreshToken, user } = res.data;
        set({ user, accessToken, refreshToken });
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        return user;
      },

      signup: async (data) => {
        const res = await api.post('/api/auth/signup', data);
        const { accessToken, refreshToken, user, restaurant } = res.data;
        set({ user: { ...user, restaurant_slug: restaurant.slug, restaurant_name: restaurant.name }, accessToken, refreshToken });
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        return { user, restaurant };
      },

      logout: async () => {
        try { await api.post('/api/auth/logout'); } catch {}
        set({ user: null, accessToken: null, refreshToken: null });
        delete api.defaults.headers.common['Authorization'];
      },

      hydrate: () => {
        const { accessToken } = get();
        if (accessToken) {
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        }
      },
    }),
    { name: 'menuos-auth', partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }) }
  )
);
