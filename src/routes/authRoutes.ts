import { Router } from 'express';
import { register, login, verifyTokenEndpoint, getProfile, deductWalletBalance, triggerOrderNotification } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// POST /api/auth/register - Register a new user
router.post('/register', register);

// POST /api/auth/login - Login and get JWT token
router.post('/login', login);

// GET /api/auth/verify - Verify JWT token
router.get('/verify', verifyTokenEndpoint);

// GET /api/auth/profile - Get user profile (including wallet balance)
router.get('/profile', authMiddleware, getProfile);

// POST /api/auth/deduct-balance - Deduct wallet balance
router.post('/deduct-balance', authMiddleware, deductWalletBalance);

// POST /api/auth/notify-order - Trigger order confirmation notification
router.post('/notify-order', authMiddleware, triggerOrderNotification);

export default router;
