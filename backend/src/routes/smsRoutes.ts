import express from 'express';
import { sendSMS } from '../controllers/smsController';
import { protectAdmin, protectUser } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/send', protectAdmin, sendSMS);
router.post('/user-send', protectUser, sendSMS);

export default router;
