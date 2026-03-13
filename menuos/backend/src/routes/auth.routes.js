import { Router } from 'express';
import { signup, login, me, logout, forgotPassword, resetPassword, changePassword } from '../controllers/auth.controller.js';
import { getActiveAnnouncements } from '../controllers/announcements.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authenticate, me);
router.post('/logout', authenticate, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', authenticate, changePassword);
router.get('/announcements', authenticate, getActiveAnnouncements);

export default router;
