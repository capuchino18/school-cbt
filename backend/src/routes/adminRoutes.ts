import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken, authorizeRoles('ADMIN', 'TEACHER'));

router.post('/questions', adminController.createQuestion);
router.get('/questions/:examId', adminController.getQuestionsByExam);
router.put('/questions/:id', adminController.updateQuestion);
router.delete('/questions/:id', adminController.deleteQuestion);

export default router;