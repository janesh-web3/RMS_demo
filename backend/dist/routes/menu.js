"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const menuController_1 = require("../controllers/menuController");
const auth_1 = require("../middleware/auth");
const upload_1 = __importDefault(require("../middleware/upload"));
const router = express_1.default.Router();
// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
    if (error instanceof Error) {
        if (error.message.includes('File too large')) {
            return res.status(400).json({
                message: 'File too large. Maximum size allowed is 5MB.'
            });
        }
        if (error.message.includes('Invalid file type')) {
            return res.status(400).json({
                message: error.message
            });
        }
    }
    next(error);
};
// Recipe/Stock linking routes - MUST come BEFORE /:id routes
router.get('/ingredients/available', auth_1.auth, menuController_1.getAvailableIngredients);
router.get('/:id/recipe', auth_1.auth, menuController_1.getMenuItemWithRecipe);
router.put('/:id/recipe', auth_1.auth, (0, auth_1.authorize)('Admin'), menuController_1.linkRecipeToMenuItem);
router.put('/:id/stock-tracking', auth_1.auth, (0, auth_1.authorize)('Admin'), menuController_1.updateStockTracking);
// Basic CRUD routes
router.get('/', auth_1.auth, menuController_1.getAllMenuItems);
router.get('/:id', auth_1.auth, menuController_1.getMenuItem);
router.post('/', auth_1.auth, (0, auth_1.authorize)('Admin'), upload_1.default.single('image'), handleMulterError, menuController_1.createMenuItem);
router.put('/:id', auth_1.auth, (0, auth_1.authorize)('Admin'), upload_1.default.single('image'), handleMulterError, menuController_1.updateMenuItem);
router.delete('/:id', auth_1.auth, (0, auth_1.authorize)('Admin'), menuController_1.deleteMenuItem);
exports.default = router;
