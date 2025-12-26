"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const billController_1 = require("../controllers/billController");
const splitBillController_1 = require("../controllers/splitBillController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Regular bill routes
router.post('/', auth_1.auth, (0, auth_1.authorize)('Cashier', 'Admin'), billController_1.createBill);
router.get('/', auth_1.auth, (0, auth_1.authorize)('Cashier', 'Admin'), billController_1.getAllBills);
router.get('/preview/:tableId', auth_1.auth, (0, auth_1.authorize)('Cashier', 'Waiter', 'Admin'), billController_1.getBillPreview);
// Split bill routes (must come before /:id to avoid route conflicts)
router.post('/split', auth_1.auth, (0, auth_1.authorize)('Cashier', 'Admin'), splitBillController_1.createSplitBill);
router.get('/split/:splitBillId', auth_1.auth, (0, auth_1.authorize)('Cashier', 'Admin'), splitBillController_1.getSplitBillDetails);
router.put('/split/:splitBillId/payment', auth_1.auth, (0, auth_1.authorize)('Cashier', 'Admin'), splitBillController_1.updateSplitBillPayment);
router.post('/split/:splitBillId/print', auth_1.auth, (0, auth_1.authorize)('Cashier', 'Admin'), splitBillController_1.printSplitBill);
router.get('/:parentBillId/splits', auth_1.auth, (0, auth_1.authorize)('Cashier', 'Admin'), splitBillController_1.getSplitBills);
// Regular bill routes continued
router.get('/:id', auth_1.auth, (0, auth_1.authorize)('Cashier', 'Admin'), billController_1.getBill);
router.get('/table/:tableId', auth_1.auth, (0, auth_1.authorize)('Cashier', 'Admin'), billController_1.getBillsByTable);
router.post('/:id/print', auth_1.auth, (0, auth_1.authorize)('Cashier', 'Admin'), billController_1.printBillById);
exports.default = router;
