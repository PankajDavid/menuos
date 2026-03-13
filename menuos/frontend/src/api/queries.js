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
  getUsers: () => api.get('/api/platform/users').then(r => r.data),
  updatePlan: (id, plan) => api.patch(`/api/platform/restaurants/${id}/plan`, { plan }).then(r => r.data),
  toggle: (id) => api.patch(`/api/platform/restaurants/${id}/toggle`).then(r => r.data),
  updateUserRole: (id, role) => api.patch(`/api/platform/users/${id}/role`, { role }).then(r => r.data),
  bulkUpdateUserRoles: (userIds, role) => api.post('/api/platform/users/bulk-update-role', { userIds, role }).then(r => r.data),
  bulkActivateUsers: (userIds, isActive) => api.post('/api/platform/users/bulk-activate', { userIds, isActive }).then(r => r.data),
  // Billing
  getInvoices: () => api.get('/api/platform/invoices').then(r => r.data),
  createInvoice: (data) => api.post('/api/platform/invoices', data).then(r => r.data),
  payInvoice: (id, data) => api.patch(`/api/platform/invoices/${id}/pay`, data).then(r => r.data),
  getDiscounts: () => api.get('/api/platform/discounts').then(r => r.data),
  createDiscount: (data) => api.post('/api/platform/discounts', data).then(r => r.data),
  checkSubscriptions: () => api.post('/api/platform/check-subscriptions').then(r => r.data),
  // Activity Logs
  getActivityLogs: (params) => api.get('/api/platform/activity-logs', { params }).then(r => r.data),
  getActivitySummary: () => api.get('/api/platform/activity-logs/summary').then(r => r.data),
  // Plan Limits
  getPlanLimits: () => api.get('/api/platform/plan-limits').then(r => r.data),
  updatePlanLimits: (plan, data) => api.patch(`/api/platform/plan-limits/${plan}`, data).then(r => r.data),
  // Analytics
  getPopularItems: () => api.get('/api/platform/popular-items').then(r => r.data),
  getGeography: () => api.get('/api/platform/geography').then(r => r.data),
  // Feature Flags
  getFeatureFlags: () => api.get('/api/platform/feature-flags').then(r => r.data),
  updateFeatureFlag: (key, data) => api.patch(`/api/platform/feature-flags/${key}`, data).then(r => r.data),
  // Email Templates
  getEmailTemplates: () => api.get('/api/platform/email-templates').then(r => r.data),
  getEmailTemplate: (key) => api.get(`/api/platform/email-templates/${key}`).then(r => r.data),
  updateEmailTemplate: (key, data) => api.patch(`/api/platform/email-templates/${key}`, data).then(r => r.data),
  previewEmailTemplate: (key, variables) => api.post(`/api/platform/email-templates/${key}/preview`, { variables }).then(r => r.data),
  sendTestEmail: (key, to, variables) => api.post(`/api/platform/email-templates/${key}/send-test`, { to, variables }).then(r => r.data),
  // Announcements
  getAnnouncements: () => api.get('/api/platform/announcements').then(r => r.data),
  createAnnouncement: (data) => api.post('/api/platform/announcements', data).then(r => r.data),
  updateAnnouncement: (id, data) => api.patch(`/api/platform/announcements/${id}`, data).then(r => r.data),
  deleteAnnouncement: (id) => api.delete(`/api/platform/announcements/${id}`).then(r => r.data),
};

export const billingApi = {
  getInvoices: (slug) => api.get(`/api/restaurants/${slug}/invoices`).then(r => r.data),
  getNotifications: (slug) => api.get(`/api/restaurants/${slug}/notifications`).then(r => r.data),
  markNotificationRead: (slug, id) => api.patch(`/api/restaurants/${slug}/notifications/${id}/read`).then(r => r.data),
};

export const limitsApi = {
  getLimits: (slug) => api.get(`/api/restaurants/${slug}/limits`).then(r => r.data),
  checkLimit: (slug, resource) => api.get(`/api/restaurants/${slug}/limits/${resource}`).then(r => r.data),
};

export const featuresApi = {
  getFeatures: (slug) => api.get(`/api/restaurants/${slug}/features`).then(r => r.data),
  checkFeature: (slug, featureKey) => api.get(`/api/restaurants/${slug}/features/${featureKey}`).then(r => r.data),
};

export const authApi = {
  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }).then(r => r.data),
  resetPassword: (token, password) => api.post('/api/auth/reset-password', { token, password }).then(r => r.data),
  changePassword: (currentPassword, newPassword) => api.post('/api/auth/change-password', { currentPassword, newPassword }).then(r => r.data),
  getAnnouncements: () => api.get('/api/auth/announcements').then(r => r.data),
};
