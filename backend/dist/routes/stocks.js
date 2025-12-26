"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const stockController_1 = require("../controllers/stockController");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.auth);
// Dashboard summary
router.get('/dashboard', stockController_1.getDashboardSummary);
// Stock item CRUD
router.get('/', stockController_1.getStockItems);
router.get('/alerts/low-stock', stockController_1.getLowStockAlerts);
router.get('/alerts/expiring', stockController_1.getExpiringItems);
router.get('/valuation', stockController_1.getStockValuation);
router.get('/transactions', stockController_1.getTransactionHistory);
router.get('/reorder-suggestions', stockController_1.getReorderSuggestions);
router.get('/:id', stockController_1.getStockItemById);
// Admin and Manager only for modifications
router.post('/', (0, auth_1.authorize)('Admin', 'Manager'), stockController_1.createStockItem);
router.put('/:id', (0, auth_1.authorize)('Admin', 'Manager'), stockController_1.updateStockItem);
router.delete('/:id', (0, auth_1.authorize)('Admin'), stockController_1.deleteStockItem);
// Stock transactions
router.post('/purchase', (0, auth_1.authorize)('Admin', 'Manager'), stockController_1.recordPurchase);
router.put('/adjust/:id', (0, auth_1.authorize)('Admin', 'Manager'), stockController_1.adjustStock);
router.post('/check-availability', stockController_1.checkAvailability);
exports.default = router;
