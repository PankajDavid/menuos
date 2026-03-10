import { Router } from 'express';
import { getAllRestaurants, getPlatformAnalytics, updatePlan, toggleRestaurant }
  from '../controllers/platform.controller.js';
import { authenticate, authorizeRole } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate, authorizeRole('platform_admin'));

router.get('/restaurants', getAllRestaurants);
router.get('/analytics', getPlatformAnalytics);
router.patch('/restaurants/:id/plan', updatePlan);
router.patch('/restaurants/:id/toggle', toggleRestaurant);

export default router;
