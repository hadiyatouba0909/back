import { Router } from 'express';
import AuthController from '../controllers/authController.js';
import _default from '../middleware/auth.js';
const { authRequired } = _default;

const router = Router();

// Routes d'authentification
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', authRequired, AuthController.getMe);
router.get('/profile', authRequired, AuthController.getProfile);
router.put('/profile', authRequired, AuthController.updateProfile);
router.put('/password', authRequired, AuthController.changePassword);

export default router;

