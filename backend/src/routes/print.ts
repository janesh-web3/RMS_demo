import express from 'express';
import { printKitchen, printBillReceipt } from '../controllers/printController';
import { auth, authorize } from '../middleware/auth';

const router = express.Router();

router.post('/kitchen', auth, authorize('Waiter', 'Kitchen', 'Admin'), printKitchen);
router.post('/bill', auth, authorize('Cashier', 'Admin'), printBillReceipt);

export default router;