import { Router } from 'express';
import { signup, login, me, logout, forgotPassword, resetPassword, changePassword } from '../controllers/auth.controller.js';
import { getActiveAnnouncements } from '../controllers/announcements.controller.js';
import { getUserTickets, getTicket, createTicket, addMessage } from '../controllers/supportTickets.controller.js';
import { applyReferralCode } from '../controllers/referralProgram.controller.js';
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
router.get('/support-tickets', authenticate, getUserTickets);
router.post('/support-tickets', authenticate, createTicket);
router.get('/support-tickets/:id', authenticate, getTicket);
router.post('/support-tickets/:id/messages', authenticate, addMessage);
router.post('/referrals/apply', applyReferralCode);

export default router;
