import express from 'express';
import {
  getDailySalesReport,
  getOrderHistory,
  getPaymentAnalytics,
  getMonthlyReport,
  getCreditAnalytics,
  getSalesReport,
  exportReport
} from '../controllers/reportController';
import { auth, authorize } from '../middleware/auth';

const router = express.Router();

router.get('/daily-sales', auth, authorize('Admin'), getDailySalesReport);
router.get('/monthly', auth, authorize('Admin'), getMonthlyReport);
router.get('/payment-analytics', auth, authorize('Admin'), getPaymentAnalytics);
router.get('/credit-analytics', auth, authorize('Admin'), getCreditAnalytics);
router.get('/order-history', auth, authorize('Admin'), getOrderHistory);
router.get('/sales', auth, authorize('Admin'), getSalesReport);
router.get('/export', auth, authorize('Admin'), exportReport);

export default router;