import { Router } from 'express';
import { authenticate, authorizeRole } from '../middleware/authenticate.js';
import { tenantResolver, requireTenantAccess } from '../middleware/tenantResolver.js';
import {
  getReportSummary,
  getDailyReport,
  getMonthlyReport,
  exportReport,
  getItemReport,
} from '../controllers/reports.controller.js';

const router = Router({ mergeParams: true });
router.use(tenantResolver);

router.get('/summary', authenticate, requireTenantAccess, authorizeRole('admin', 'staff', 'platform_admin'), getReportSummary);
router.get('/daily', authenticate, requireTenantAccess, authorizeRole('admin', 'staff', 'platform_admin'), getDailyReport);
router.get('/monthly', authenticate, requireTenantAccess, authorizeRole('admin', 'staff', 'platform_admin'), getMonthlyReport);
router.get('/items', authenticate, requireTenantAccess, authorizeRole('admin', 'staff', 'platform_admin'), getItemReport);
router.get('/export', authenticate, requireTenantAccess, authorizeRole('admin', 'staff', 'platform_admin'), exportReport);

export default router;
