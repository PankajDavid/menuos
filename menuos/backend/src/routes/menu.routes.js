import { Router } from 'express';
import { getMenu, getAllMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, toggleAvailability }
  from '../controllers/menu.controller.js';
import { authenticate, authorizeRole } from '../middleware/authenticate.js';
import { tenantResolver, requireTenantAccess } from '../middleware/tenantResolver.js';
import { checkMenuItemLimit } from '../middleware/checkSubscription.js';

const router = Router({ mergeParams: true });

router.use(tenantResolver);

// Public
router.get('/', getMenu);

// Admin/Staff only
router.get('/all', authenticate, requireTenantAccess, authorizeRole('admin', 'staff'), getAllMenuItems);
router.post('/', authenticate, requireTenantAccess, authorizeRole('admin'), checkMenuItemLimit, createMenuItem);
router.put('/:itemId', authenticate, requireTenantAccess, authorizeRole('admin'), updateMenuItem);
router.delete('/:itemId', authenticate, requireTenantAccess, authorizeRole('admin'), deleteMenuItem);
router.patch('/:itemId/toggle', authenticate, requireTenantAccess, authorizeRole('admin', 'staff'), toggleAvailability);

export default router;
