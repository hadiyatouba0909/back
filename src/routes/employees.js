import { Router } from 'express';
import EmployeeController from '../controllers/employeeController.js';
import _default from '../middleware/auth.js';
const { authRequired } = _default;

const router = Router();

// Routes pour les employés
router.get('/', authRequired, EmployeeController.getAll);
router.get('/:id', authRequired, EmployeeController.getById);
router.post('/', authRequired, EmployeeController.create);
router.put('/:id', authRequired, EmployeeController.update);
router.delete('/:id', authRequired, EmployeeController.delete);

export default router;

