import express from 'express';
import { 
  getAllMenuItems, 
  getMenuItem,
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem 
} from '../controllers/menuController';
import { auth, authorize } from '../middleware/auth';

const router = express.Router();

router.get('/', auth, getAllMenuItems);
router.get('/:id', auth, getMenuItem);
router.post('/', auth, authorize('Admin'), createMenuItem);
router.put('/:id', auth, authorize('Admin'), updateMenuItem);
router.delete('/:id', auth, authorize('Admin'), deleteMenuItem);

export default router;