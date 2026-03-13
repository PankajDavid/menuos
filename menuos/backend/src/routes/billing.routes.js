import { Router } from 'express';
import { 
  getAllInvoices, 
  getRestaurantInvoices, 
  createInvoice, 
  payInvoice,
  getDiscounts,
  createDiscount,
  getNotifications,
  markNotificationRead,
  checkSubscriptions
} from '../controllers/billing.controller.js';
import { authenticate, authorizeRole } from '../middleware/authenticate.js';
import { tenantResolver, requireTenantAccess } from '../middleware/tenantResolver.js';

const router = Router();

// Platform admin routes
router.get('/platform/invoices', authenticate, authorizeRole('platform_admin'), getAllInvoices);
router.post('/platform/invoices', authenticate, authorizeRole('platform_admin'), createInvoice);
router.patch('/platform/invoices/:id/pay', authenticate, authorizeRole('platform_admin'), payInvoice);
router.get('/platform/discounts', authenticate, authorizeRole('platform_admin'), getDiscounts);
router.post('/platform/discounts', authenticate, authorizeRole('platform_admin'), createDiscount);
router.post('/platform/check-subscriptions', authenticate, authorizeRole('platform_admin'), checkSubscriptions);

// Restaurant routes
router.get('/restaurants/:slug/invoices', tenantResolver, authenticate, requireTenantAccess, getRestaurantInvoices);
router.get('/restaurants/:slug/notifications', tenantResolver, authenticate, requireTenantAccess, getNotifications);
router.patch('/restaurants/:slug/notifications/:id/read', tenantResolver, authenticate, requireTenantAccess, markNotificationRead);

export default router;
