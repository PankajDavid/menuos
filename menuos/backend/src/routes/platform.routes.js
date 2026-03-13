import { Router } from 'express';
import { getAllRestaurants, getPlatformAnalytics, updatePlan, toggleRestaurant, updateUserRole, getAllUsers }
  from '../controllers/platform.controller.js';
import { authenticate, authorizeRole } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate, authorizeRole('platform_admin'));

router.get('/restaurants', getAllRestaurants);
router.get('/analytics', getPlatformAnalytics);
router.get('/users', getAllUsers);
router.patch('/restaurants/:id/plan', updatePlan);
router.patch('/restaurants/:id/toggle', toggleRestaurant);
router.patch('/users/:id/role', updateUserRole);

export default router;
