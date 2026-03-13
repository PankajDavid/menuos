import { Router } from 'express';
import { getTables, createTable, deleteTable, getQRCode } from '../controllers/table.controller.js';
import { authenticate, authorizeRole } from '../middleware/authenticate.js';
import { tenantResolver, requireTenantAccess } from '../middleware/tenantResolver.js';

const router = Router({ mergeParams: true });
router.use(tenantResolver, authenticate, requireTenantAccess, authorizeRole('admin', 'platform_admin'));

router.get('/', getTables);
router.post('/', createTable);
router.delete('/:tableId', deleteTable);
router.get('/:tableId/qr', getQRCode);

export default router;
