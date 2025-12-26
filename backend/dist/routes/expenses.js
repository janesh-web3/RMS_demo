"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const expenseController_1 = require("../controllers/expenseController");
const budgetController_1 = require("../controllers/budgetController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Expense routes
router.post('/add', auth_1.auth, (0, auth_1.authorize)('Admin', 'Cashier'), expenseController_1.addExpense);
router.put('/update/:id', auth_1.auth, (0, auth_1.authorize)('Admin', 'Cashier'), expenseController_1.updateExpense);
router.delete('/delete/:id', auth_1.auth, (0, auth_1.authorize)('Admin'), expenseController_1.deleteExpense);
router.get('/', auth_1.auth, (0, auth_1.authorize)('Admin', 'Cashier'), expenseController_1.getExpenses);
router.get('/reports', auth_1.auth, (0, auth_1.authorize)('Admin', 'Cashier'), expenseController_1.getExpenseReports);
router.get('/export', auth_1.auth, (0, auth_1.authorize)('Admin', 'Cashier'), expenseController_1.exportExpenses);
// Budget routes
router.post('/budgets', auth_1.auth, (0, auth_1.authorize)('Admin'), budgetController_1.createBudget);
router.put('/budgets/:id', auth_1.auth, (0, auth_1.authorize)('Admin'), budgetController_1.updateBudget);
router.delete('/budgets/:id', auth_1.auth, (0, auth_1.authorize)('Admin'), budgetController_1.deleteBudget);
router.get('/budgets', auth_1.auth, (0, auth_1.authorize)('Admin', 'Cashier'), budgetController_1.getBudgets);
router.get('/budget-vs-actual', auth_1.auth, (0, auth_1.authorize)('Admin', 'Cashier'), budgetController_1.getBudgetVsActual);
exports.default = router;
