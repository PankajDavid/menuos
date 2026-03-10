import { Router } from 'express';
import { signup, login, me, logout } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authenticate, me);
router.post('/logout', authenticate, logout);

export default router;
