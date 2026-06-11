import express from 'express';
import { createAlert, getAlerts, resolveAlert, updateAlert } from '../controllers/alertController';
import { protectUser, protectAdmin } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protectUser, createAlert);
router.put('/:id', protectUser, updateAlert);
router.get('/', protectAdmin, getAlerts);
router.put('/:id/resolve', protectAdmin, resolveAlert);

export default router;
