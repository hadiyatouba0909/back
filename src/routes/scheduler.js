import { Router } from 'express';
import SchedulerController from '../controllers/schedulerController.js';
import _default from '../middleware/auth.js';
const { authRequired } = _default;

const router = Router();

// Routes pour le scheduler
router.get('/status', authRequired, SchedulerController.getStatus);
router.post('/check-payments', authRequired, SchedulerController.checkPayments);
router.post('/restart', authRequired, SchedulerController.restart);
router.post('/start', authRequired, SchedulerController.start);
router.post('/stop', authRequired, SchedulerController.stop);

// Routes pour les statistiques et rapports
router.get('/statistics', authRequired, SchedulerController.getStatistics);
router.get('/overdue', authRequired, SchedulerController.getOverduePayments);
router.get('/upcoming', authRequired, SchedulerController.getUpcomingPayments);
router.get('/pending', authRequired, SchedulerController.getPendingPayments);

export default router;

