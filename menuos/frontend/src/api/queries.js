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
  // Support Tickets (Platform Admin)
  getSupportTickets: (params) => api.get('/api/platform/support-tickets', { params }).then(r => r.data),
  getTicketStats: () => api.get('/api/platform/support-tickets/stats').then(r => r.data),
  updateTicket: (id, data) => api.patch(`/api/platform/support-tickets/${id}`, data).then(r => r.data),
  // Onboarding (Platform Admin)
  getOnboardingItems: () => api.get('/api/platform/onboarding-items').then(r => r.data),
  createOnboardingItem: (data) => api.post('/api/platform/onboarding-items', data).then(r => r.data),
  updateOnboardingItem: (id, data) => api.patch(`/api/platform/onboarding-items/${id}`, data).then(r => r.data),
  deleteOnboardingItem: (id) => api.delete(`/api/platform/onboarding-items/${id}`).then(r => r.data),
  getOnboardingOverview: () => api.get('/api/platform/onboarding/overview').then(r => r.data),
  // Trial Management (Platform Admin)
  getTrials: (params) => api.get('/api/platform/trials', { params }).then(r => r.data),
  getTrialStats: () => api.get('/api/platform/trials/stats').then(r => r.data),
  startTrial: (data) => api.post('/api/platform/trials', data).then(r => r.data),
  convertTrial: (id, plan) => api.post(`/api/platform/trials/${id}/convert`, { plan }).then(r => r.data),
  extendTrial: (id, days) => api.post(`/api/platform/trials/${id}/extend`, { days }).then(r => r.data),
  getTrialEngagement: (id) => api.get(`/api/platform/trials/${id}/engagement`).then(r => r.data),
  // Revenue Analytics (Platform Admin)
  getRevenueAnalytics: (period) => api.get('/api/platform/revenue/analytics', { params: { period } }).then(r => r.data),
  getMrrHistory: (months) => api.get('/api/platform/revenue/mrr-history', { params: { months } }).then(r => r.data),
  getUpgradeAnalysis: (period) => api.get('/api/platform/revenue/upgrades', { params: { period } }).then(r => r.data),
  // Referral Program (Platform Admin)
  getReferrals: (params) => api.get('/api/platform/referrals', { params }).then(r => r.data),
  getReferralStats: () => api.get('/api/platform/referrals/stats').then(r => r.data),
  markReferralConverted: (id) => api.post(`/api/platform/referrals/${id}/mark-converted`).then(r => r.data),
  payReferralReward: (id, amount) => api.post(`/api/platform/referrals/${id}/pay-reward`, { amount }).then(r => r.data),
  // In-App Messaging (Platform Admin)
  getConversations: (params) => api.get('/api/platform/conversations', { params }).then(r => r.data),
  getConversation: (id) => api.get(`/api/platform/conversations/${id}`).then(r => r.data),
  getMessagingStats: () => api.get('/api/platform/conversations/stats').then(r => r.data),
  createConversation: (data) => api.post('/api/platform/conversations', data).then(r => r.data),
  sendMessage: (id, content) => api.post(`/api/platform/conversations/${id}/messages`, { content }).then(r => r.data),
  updateConversation: (id, data) => api.patch(`/api/platform/conversations/${id}`, data).then(r => r.data),
  // Failed Payments (Platform Admin)
  getFailedPayments: (params) => api.get('/api/platform/failed-payments', { params }).then(r => r.data),
  getFailedPaymentStats: (days) => api.get('/api/platform/failed-payments/stats', { params: { days } }).then(r => r.data),
  getDunningReport: () => api.get('/api/platform/failed-payments/dunning-report').then(r => r.data),
  retryFailedPayment: (id) => api.post(`/api/platform/failed-payments/${id}/retry`).then(r => r.data),
  resolveFailedPayment: (id, notes) => api.post(`/api/platform/failed-payments/${id}/resolve`, { notes }).then(r => r.data),
  cancelFailedPayment: (id, notes) => api.post(`/api/platform/failed-payments/${id}/cancel`, { notes }).then(r => r.data),
  moveToDunning: (id) => api.post(`/api/platform/failed-payments/${id}/dunning`).then(r => r.data),
  // Restaurant Health (Platform Admin)
  getRestaurantHealth: (params) => api.get('/api/platform/health', { params }).then(r => r.data),
  getHealthStats: () => api.get('/api/platform/health/stats').then(r => r.data),
  getRestaurantHealthDetail: (id) => api.get(`/api/platform/health/${id}`).then(r => r.data),
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

export const onboardingApi = {
  getOnboarding: (slug) => api.get(`/api/restaurants/${slug}/onboarding`).then(r => r.data),
  completeItem: (slug, itemId, notes) => api.post(`/api/restaurants/${slug}/onboarding/${itemId}/complete`, { notes }).then(r => r.data),
  uncompleteItem: (slug, itemId) => api.post(`/api/restaurants/${slug}/onboarding/${itemId}/uncomplete`).then(r => r.data),
};

export const trialApi = {
  trackEngagement: (slug, eventType, eventData) => api.post(`/api/restaurants/${slug}/trial/track`, { event_type: eventType, event_data: eventData }).then(r => r.data),
};

export const referralApi = {
  getMyReferralCodes: (slug) => api.get(`/api/restaurants/${slug}/referral-codes`).then(r => r.data),
  createReferralCode: (slug, data) => api.post(`/api/restaurants/${slug}/referral-codes`, data).then(r => r.data),
  getMyReferrals: (slug) => api.get(`/api/restaurants/${slug}/referrals`).then(r => r.data),
  applyReferralCode: (code, restaurantId) => api.post('/api/auth/referrals/apply', { code, restaurant_id: restaurantId }).then(r => r.data),
};

export const messagingApi = {
  getConversations: (slug) => api.get(`/api/restaurants/${slug}/conversations`).then(r => r.data),
  createConversation: (slug, data) => api.post(`/api/restaurants/${slug}/conversations`, data).then(r => r.data),
  getConversation: (slug, id) => api.get(`/api/restaurants/${slug}/conversations/${id}`).then(r => r.data),
  sendMessage: (slug, id, content) => api.post(`/api/restaurants/${slug}/conversations/${id}/messages`, { content }).then(r => r.data),
};

export const authApi = {
  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }).then(r => r.data),
  resetPassword: (token, password) => api.post('/api/auth/reset-password', { token, password }).then(r => r.data),
  changePassword: (currentPassword, newPassword) => api.post('/api/auth/change-password', { currentPassword, newPassword }).then(r => r.data),
  getAnnouncements: () => api.get('/api/auth/announcements').then(r => r.data),
  // Support Tickets (User)
  getUserTickets: () => api.get('/api/auth/support-tickets').then(r => r.data),
  createTicket: (data) => api.post('/api/auth/support-tickets', data).then(r => r.data),
  getTicket: (id) => api.get(`/api/auth/support-tickets/${id}`).then(r => r.data),
  addMessage: (id, message) => api.post(`/api/auth/support-tickets/${id}/messages`, { message }).then(r => r.data),
};
