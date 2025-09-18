import { Router } from 'express';
import CompanyController from '../controllers/companyController.js';
import _default from '../middleware/auth.js';
const { authRequired } = _default;

const router = Router();

// Routes pour les entreprises
router.get('/', authRequired, CompanyController.getAll);
router.get('/:id', authRequired, CompanyController.getById);
router.post('/', authRequired, CompanyController.create);
router.put('/:id', authRequired, CompanyController.update);

export default router;

