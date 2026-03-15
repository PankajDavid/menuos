import { Router } from 'express';
import { authenticate, requireRestaurantAccess } from '../middleware/authenticate.js';
import {
  getReportSummary,
  getDailyReport,
  getMonthlyReport,
  exportReport,
  getItemReport,
} from '../controllers/reports.controller.js';

const router = Router();

router.use(authenticate, requireRestaurantAccess);

router.get('/summary', getReportSummary);
router.get('/daily', getDailyReport);
router.get('/monthly', getMonthlyReport);
router.get('/items', getItemReport);
router.get('/export', exportReport);

export default router;
