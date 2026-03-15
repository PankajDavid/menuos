import { Router } from 'express';
import { createOrder, getOrders, updateOrderStatus, initiatePayment, applyDiscount }
  from '../controllers/order.controller.js';
import { authenticate, authorizeRole } from '../middleware/authenticate.js';
import { tenantResolver, requireTenantAccess } from '../middleware/tenantResolver.js';
import { checkOrderLimit } from '../middleware/checkSubscription.js';

const router = Router({ mergeParams: true });
router.use(tenantResolver);

router.post('/payment', initiatePayment);
router.post('/', checkOrderLimit, createOrder);
router.get('/', authenticate, requireTenantAccess, authorizeRole('admin', 'staff', 'kitchen', 'platform_admin'), getOrders);
router.patch('/:orderId/status', authenticate, requireTenantAccess, authorizeRole('admin', 'staff', 'kitchen', 'platform_admin'), updateOrderStatus);
router.patch('/:orderId/discount', authenticate, requireTenantAccess, authorizeRole('admin', 'staff', 'platform_admin'), applyDiscount);

export default router;
