import { Router } from 'express';
import CurrencyController from '../controllers/currencyController.js';
import authMiddleware from '../middleware/auth.js';

const { authRequired } = authMiddleware;
const router = Router();

// Routes pour les devises
router.get('/rates', authRequired, CurrencyController.getRates);
router.get('/convert', authRequired, CurrencyController.convert);
router.get('/supported', authRequired, CurrencyController.getSupportedCurrencies);
router.get('/cache/info', authRequired, CurrencyController.getCacheInfo);
router.delete('/cache', authRequired, CurrencyController.clearCache);

export default router;

