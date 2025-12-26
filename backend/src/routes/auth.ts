import express from 'express';
import { login, register, getCurrentUser, getAllUsers, createUser, updateUser, updateUserPassword, deleteUser } from '../controllers/authController';
import { auth, authorize } from '../middleware/auth';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', auth, getCurrentUser);

// Admin-only user management routes
router.get('/users', auth, getAllUsers);
router.post('/users', auth, createUser);
router.put('/users/:userId', auth, updateUser);
router.put('/users/:userId/password', auth, updateUserPassword);
router.delete('/users/:userId', auth, deleteUser);

export default router;