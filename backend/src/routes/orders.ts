import express from 'express';
import {
  createOrder,
  getOrdersByTable,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getOrdersBySession,
  printOrderById,
  addItemsToOrder,
  getActiveOrderForTable
} from '../controllers/orderController';
import { auth, authorize } from '../middleware/auth';

const router = express.Router();

router.post('/', auth, authorize('Waiter', 'Admin'), createOrder);
router.post('/:orderId/add-items', auth, authorize('Waiter', 'Admin'), addItemsToOrder);
router.get('/', auth, getAllOrders);
router.get('/:id', auth, getOrderById);
router.get('/table/:tableId', auth, getOrdersByTable);
router.get('/table/:tableId/active', auth, getActiveOrderForTable);
router.get('/table/:tableId/session/:sessionId', auth, getOrdersBySession);
router.put('/:id/status', auth, authorize('Kitchen', 'Waiter', 'Admin'), updateOrderStatus);
router.post('/:id/print', auth, authorize('Waiter', 'Kitchen', 'Admin'), printOrderById);

export default router;