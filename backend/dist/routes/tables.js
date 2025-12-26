"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tableController_1 = require("../controllers/tableController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', auth_1.auth, tableController_1.getAllTables);
router.post('/', auth_1.auth, (0, auth_1.authorize)('Admin'), tableController_1.createTable);
router.put('/:id', auth_1.auth, (0, auth_1.authorize)('Waiter', 'Admin'), tableController_1.updateTable);
router.delete('/:id', auth_1.auth, (0, auth_1.authorize)('Admin'), tableController_1.deleteTable);
exports.default = router;
