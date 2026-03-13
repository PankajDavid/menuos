import { Router } from 'express';
import { getRestaurant, updateRestaurant, getAnalytics } from '../controllers/restaurant.controller.js';
import { getStaff, createStaff, toggleStaffStatus } from '../controllers/staff.controller.js';
import { getRestaurantLimits, checkLimit } from '../controllers/planLimits.controller.js';
import { authenticate, authorizeRole } from '../middleware/authenticate.js';
import { tenantResolver, requireTenantAccess } from '../middleware/tenantResolver.js';

const router = Router();

router.get('/:slug', tenantResolver, getRestaurant);
router.put('/:slug', tenantResolver, authenticate, requireTenantAccess, authorizeRole('admin', 'platform_admin'), updateRestaurant);
router.get('/:slug/analytics', tenantResolver, authenticate, requireTenantAccess, authorizeRole('admin', 'platform_admin'), getAnalytics);

// Staff management routes
router.get('/:slug/staff', tenantResolver, authenticate, requireTenantAccess, authorizeRole('admin', 'platform_admin'), getStaff);
router.post('/:slug/staff', tenantResolver, authenticate, requireTenantAccess, authorizeRole('admin', 'platform_admin'), createStaff);
router.patch('/:slug/staff/:userId/toggle', tenantResolver, authenticate, requireTenantAccess, authorizeRole('admin', 'platform_admin'), toggleStaffStatus);

// Plan limits routes
router.get('/:slug/limits', tenantResolver, authenticate, requireTenantAccess, getRestaurantLimits);
router.get('/:slug/limits/:resource', tenantResolver, authenticate, requireTenantAccess, checkLimit);

export default router;
