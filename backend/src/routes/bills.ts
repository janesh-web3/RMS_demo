import express from 'express';
import { 
  createBill, 
  getBillsByTable, 
  getAllBills,
  getBill,
  getBillPreview,
  printBillById
} from '../controllers/billController';
import { auth, authorize } from '../middleware/auth';

const router = express.Router();

router.post('/', auth, authorize('Cashier', 'Admin'), createBill);
router.get('/', auth, authorize('Cashier', 'Admin'), getAllBills);
router.get('/preview/:tableId', auth, authorize('Cashier', 'Waiter', 'Admin'), getBillPreview);
router.get('/:id', auth, authorize('Cashier', 'Admin'), getBill);
router.get('/table/:tableId', auth, authorize('Cashier', 'Admin'), getBillsByTable);
router.post('/:id/print', auth, authorize('Cashier', 'Admin'), printBillById);

export default router;