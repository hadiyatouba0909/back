import { Router } from 'express';
import PaymentController from '../controllers/paymentController.js';
import _default from '../middleware/auth.js';
const { authRequired } = _default;

const router = Router();

// Routes pour les paiements
router.get('/', authRequired, PaymentController.getAll);
router.post('/', authRequired, PaymentController.create);
router.put('/:id', authRequired, PaymentController.update);
router.delete('/:id', authRequired, PaymentController.delete);
router.post('/batch', authRequired, PaymentController.createBatch);

export default router;

