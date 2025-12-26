"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reportController_1 = require("../controllers/reportController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/daily-sales', auth_1.auth, (0, auth_1.authorize)('Admin'), reportController_1.getDailySalesReport);
router.get('/sales-range', auth_1.auth, (0, auth_1.authorize)('Admin'), reportController_1.getSalesRangeReport);
router.get('/monthly', auth_1.auth, (0, auth_1.authorize)('Admin'), reportController_1.getMonthlyReport);
router.get('/payment-analytics', auth_1.auth, (0, auth_1.authorize)('Admin'), reportController_1.getPaymentAnalytics);
router.get('/credit-analytics', auth_1.auth, (0, auth_1.authorize)('Admin'), reportController_1.getCreditAnalytics);
router.get('/order-history', auth_1.auth, (0, auth_1.authorize)('Admin'), reportController_1.getOrderHistory);
router.get('/sales', auth_1.auth, (0, auth_1.authorize)('Admin'), reportController_1.getSalesReport);
router.get('/export', auth_1.auth, (0, auth_1.authorize)('Admin'), reportController_1.exportReport);
exports.default = router;
