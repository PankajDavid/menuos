import { Router } from 'express';
import { getRestaurant, updateRestaurant, getAnalytics } from '../controllers/restaurant.controller.js';
import { authenticate, authorizeRole } from '../middleware/authenticate.js';
import { tenantResolver, requireTenantAccess } from '../middleware/tenantResolver.js';

const router = Router();

router.get('/:slug', tenantResolver, getRestaurant);
router.put('/:slug', tenantResolver, authenticate, requireTenantAccess, authorizeRole('admin'), updateRestaurant);
router.get('/:slug/analytics', tenantResolver, authenticate, requireTenantAccess, authorizeRole('admin'), getAnalytics);

export default router;
