import { Router } from 'express';
import { getAllRestaurants, getPlatformAnalytics, updatePlan, toggleRestaurant, updateUserRole, getAllUsers, exportRestaurants, exportOrders, getPopularItems }
  from '../controllers/platform.controller.js';
import { getActivityLogs, getActivitySummary } from '../controllers/activity.controller.js';
import { getPlanLimits, updatePlanLimits } from '../controllers/planLimits.controller.js';
import { authenticate, authorizeRole } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate, authorizeRole('platform_admin'));

router.get('/restaurants', getAllRestaurants);
router.get('/analytics', getPlatformAnalytics);
router.get('/users', getAllUsers);
router.get('/export/restaurants', exportRestaurants);
router.get('/export/orders', exportOrders);
router.get('/activity-logs', getActivityLogs);
router.get('/activity-logs/summary', getActivitySummary);
router.get('/plan-limits', getPlanLimits);
router.patch('/plan-limits/:plan', updatePlanLimits);
router.get('/popular-items', getPopularItems);
router.patch('/restaurants/:id/plan', updatePlan);
router.patch('/restaurants/:id/toggle', toggleRestaurant);
router.patch('/users/:id/role', updateUserRole);

export default router;
