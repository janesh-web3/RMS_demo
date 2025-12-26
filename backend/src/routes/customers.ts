import express from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addCreditPayment,
  getCreditHistory,
  getCustomersWithCredit
} from '../controllers/customerController';

const router = express.Router();

// Get all customers with filters
router.get('/', getCustomers);

// Get customers with outstanding credit
router.get('/with-credit', getCustomersWithCredit);

// Get customer by ID
router.get('/:id', getCustomerById);

// Create new customer
router.post('/', createCustomer);

// Update customer
router.put('/:id', updateCustomer);

// Delete customer (soft delete)
router.delete('/:id', deleteCustomer);

// Add credit payment
router.post('/:id/credit-payment', addCreditPayment);

// Get credit history
router.get('/:id/credit-history', getCreditHistory);

export default router;