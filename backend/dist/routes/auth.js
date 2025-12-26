"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.post('/login', authController_1.login);
router.post('/register', authController_1.register);
router.get('/me', auth_1.auth, authController_1.getCurrentUser);
// Admin-only user management routes
router.get('/users', auth_1.auth, authController_1.getAllUsers);
router.post('/users', auth_1.auth, authController_1.createUser);
router.put('/users/:userId', auth_1.auth, authController_1.updateUser);
router.put('/users/:userId/password', auth_1.auth, authController_1.updateUserPassword);
router.delete('/users/:userId', auth_1.auth, authController_1.deleteUser);
exports.default = router;
