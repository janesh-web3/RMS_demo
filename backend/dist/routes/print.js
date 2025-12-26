"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const printController_1 = require("../controllers/printController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.post('/kitchen', auth_1.auth, (0, auth_1.authorize)('Waiter', 'Kitchen', 'Admin'), printController_1.printKitchen);
router.post('/bill', auth_1.auth, (0, auth_1.authorize)('Cashier', 'Admin'), printController_1.printBillReceipt);
exports.default = router;
