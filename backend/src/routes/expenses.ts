import express from 'express';
import {
  addExpense,
  updateExpense,
  deleteExpense,
  getExpenses,
  getExpenseReports,
  exportExpenses
} from '../controllers/expenseController';
import {
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgets,
  getBudgetVsActual
} from '../controllers/budgetController';
import { auth, authorize } from '../middleware/auth';

const router = express.Router();

// Expense routes
router.post('/add', auth, authorize('Admin', 'Cashier'), addExpense);
router.put('/update/:id', auth, authorize('Admin', 'Cashier'), updateExpense);
router.delete('/delete/:id', auth, authorize('Admin'), deleteExpense);
router.get('/', auth, authorize('Admin', 'Cashier'), getExpenses);
router.get('/reports', auth, authorize('Admin', 'Cashier'), getExpenseReports);
router.get('/export', auth, authorize('Admin', 'Cashier'), exportExpenses);

// Budget routes
router.post('/budgets', auth, authorize('Admin'), createBudget);
router.put('/budgets/:id', auth, authorize('Admin'), updateBudget);
router.delete('/budgets/:id', auth, authorize('Admin'), deleteBudget);
router.get('/budgets', auth, authorize('Admin', 'Cashier'), getBudgets);
router.get('/budget-vs-actual', auth, authorize('Admin', 'Cashier'), getBudgetVsActual);

export default router;