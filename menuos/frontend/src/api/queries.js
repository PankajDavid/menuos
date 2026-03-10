import api from './axios.js';

export const menuApi = {
  getPublic: (slug) => api.get(`/api/restaurants/${slug}/menu`).then(r => r.data),
  getAll: (slug) => api.get(`/api/restaurants/${slug}/menu/all`).then(r => r.data),
  create: (slug, data) => api.post(`/api/restaurants/${slug}/menu`, data).then(r => r.data),
  update: (slug, id, data) => api.put(`/api/restaurants/${slug}/menu/${id}`, data).then(r => r.data),
  delete: (slug, id) => api.delete(`/api/restaurants/${slug}/menu/${id}`).then(r => r.data),
  toggle: (slug, id) => api.patch(`/api/restaurants/${slug}/menu/${id}/toggle`).then(r => r.data),
};

export const orderApi = {
  pay: (slug, amount) => api.post(`/api/restaurants/${slug}/orders/payment`, { amount }).then(r => r.data),
  create: (slug, data) => api.post(`/api/restaurants/${slug}/orders`, data).then(r => r.data),
  getAll: (slug, params) => api.get(`/api/restaurants/${slug}/orders`, { params }).then(r => r.data),
  updateStatus: (slug, id, status) => api.patch(`/api/restaurants/${slug}/orders/${id}/status`, { status }).then(r => r.data),
};

export const tableApi = {
  getAll: (slug) => api.get(`/api/restaurants/${slug}/tables`).then(r => r.data),
  create: (slug, data) => api.post(`/api/restaurants/${slug}/tables`, data).then(r => r.data),
  delete: (slug, id) => api.delete(`/api/restaurants/${slug}/tables/${id}`).then(r => r.data),
  getQR: (slug, id) => api.get(`/api/restaurants/${slug}/tables/${id}/qr`).then(r => r.data),
};

export const restaurantApi = {
  get: (slug) => api.get(`/api/restaurants/${slug}`).then(r => r.data),
  update: (slug, data) => api.put(`/api/restaurants/${slug}`, data).then(r => r.data),
  getAnalytics: (slug) => api.get(`/api/restaurants/${slug}/analytics`).then(r => r.data),
};

export const platformApi = {
  getRestaurants: () => api.get('/api/platform/restaurants').then(r => r.data),
  getAnalytics: () => api.get('/api/platform/analytics').then(r => r.data),
  updatePlan: (id, plan) => api.patch(`/api/platform/restaurants/${id}/plan`, { plan }).then(r => r.data),
  toggle: (id) => api.patch(`/api/platform/restaurants/${id}/toggle`).then(r => r.data),
};
