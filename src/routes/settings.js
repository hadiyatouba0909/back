import { Router } from 'express';
import SettingsController from '../controllers/settingsController.js';
import _default from '../middleware/auth.js';
const { authRequired } = _default;

const router = Router();

// Routes pour les paramètres
router.get('/exchange-rate', authRequired, SettingsController.getExchangeRate);
router.put('/exchange-rate', authRequired, SettingsController.updateExchangeRate);

// Routes génériques pour les paramètres (optionnelles)
router.get('/', authRequired, SettingsController.getAll);
router.get('/:key', authRequired, SettingsController.getByKey);
router.put('/:key', authRequired, SettingsController.setValue);
router.delete('/:key', authRequired, SettingsController.delete);

export default router;

