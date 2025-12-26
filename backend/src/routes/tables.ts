import express from 'express';
import { 
  getAllTables, 
  createTable, 
  updateTable, 
  deleteTable 
} from '../controllers/tableController';
import { auth, authorize } from '../middleware/auth';

const router = express.Router();

router.get('/', auth, getAllTables);
router.post('/', auth, authorize('Admin'), createTable);
router.put('/:id', auth, authorize('Waiter', 'Admin'), updateTable);
router.delete('/:id', auth, authorize('Admin'), deleteTable);

export default router;