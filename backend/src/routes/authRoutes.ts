import express from 'express';
import {
  registerUser,
  loginUser,
  registerAdmin,
  loginAdmin,
  updateContacts
} from '../controllers/authController';
import { protectUser } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/user/register', registerUser);
router.post('/user/login', loginUser);
router.put('/user/contacts', protectUser, updateContacts);

router.post('/admin/register', registerAdmin);
router.post('/admin/login', loginAdmin);

export default router;
