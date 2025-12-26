"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const supplierController_1 = require("../controllers/supplierController");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.auth);
// Supplier CRUD
router.get('/', supplierController_1.getSuppliers);
router.get('/:id', supplierController_1.getSupplierById);
// Admin and Manager only for modifications
router.post('/', (0, auth_1.authorize)('Admin', 'Manager'), supplierController_1.createSupplier);
router.put('/:id', (0, auth_1.authorize)('Admin', 'Manager'), supplierController_1.updateSupplier);
router.delete('/:id', (0, auth_1.authorize)('Admin'), supplierController_1.deleteSupplier);
exports.default = router;
