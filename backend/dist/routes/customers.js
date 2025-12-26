"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const customerController_1 = require("../controllers/customerController");
const router = express_1.default.Router();
// Get all customers with filters
router.get('/', customerController_1.getCustomers);
// Get customers with outstanding credit
router.get('/with-credit', customerController_1.getCustomersWithCredit);
// Get customer by ID
router.get('/:id', customerController_1.getCustomerById);
// Create new customer
router.post('/', customerController_1.createCustomer);
// Update customer
router.put('/:id', customerController_1.updateCustomer);
// Delete customer (soft delete)
router.delete('/:id', customerController_1.deleteCustomer);
// Add credit payment
router.post('/:id/credit-payment', customerController_1.addCreditPayment);
// Get credit history
router.get('/:id/credit-history', customerController_1.getCreditHistory);
exports.default = router;
