"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStockTracking = exports.getAvailableIngredients = exports.getMenuItemWithRecipe = exports.linkRecipeToMenuItem = exports.deleteMenuItem = exports.updateMenuItem = exports.createMenuItem = exports.getMenuItem = exports.getAllMenuItems = void 0;
const MenuItem_1 = __importDefault(require("../models/MenuItem"));
const StockItem_1 = __importDefault(require("../models/StockItem"));
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const getAllMenuItems = async (req, res) => {
    try {
        const { category, active } = req.query;
        let filter = {};
        if (category)
            filter.category = category;
        if (active !== undefined)
            filter.isActive = active === 'true';
        const menuItems = await MenuItem_1.default.find(filter).sort({ category: 1, name: 1 });
        res.json(menuItems);
    }
    catch (error) {
        console.error('Get menu items error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllMenuItems = getAllMenuItems;
const getMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const menuItem = await MenuItem_1.default.findById(id);
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        res.json(menuItem);
    }
    catch (error) {
        console.error('Get menu item error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getMenuItem = getMenuItem;
const createMenuItem = async (req, res) => {
    try {
        const { name, price, category, variations, addOns, description, printToKitchen } = req.body;
        if (!name || !price || !category) {
            return res.status(400).json({
                message: 'Name, price, and category are required'
            });
        }
        // Get image URL from uploaded file (if any)
        let imageUrl = undefined;
        if (req.file) {
            imageUrl = req.file.path; // Cloudinary URL
        }
        const menuItem = new MenuItem_1.default({
            name,
            price,
            category,
            variations: variations ? JSON.parse(variations) : [],
            addOns: addOns ? JSON.parse(addOns) : [],
            description,
            imageUrl,
            printToKitchen: printToKitchen !== undefined ? JSON.parse(printToKitchen) : true,
            isActive: true
        });
        await menuItem.save();
        res.status(201).json(menuItem);
    }
    catch (error) {
        console.error('Create menu item error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createMenuItem = createMenuItem;
const updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        let updates = { ...req.body };
        // Handle image upload if new file is provided
        if (req.file) {
            updates.imageUrl = req.file.path; // Cloudinary URL
            // If there was a previous image, optionally delete it from Cloudinary
            const existingItem = await MenuItem_1.default.findById(id);
            if (existingItem?.imageUrl) {
                try {
                    // Extract public_id from Cloudinary URL to delete old image
                    const publicId = existingItem.imageUrl.split('/').pop()?.split('.')[0];
                    if (publicId) {
                        await cloudinary_1.default.uploader.destroy(`restaurant-menu-items/${publicId}`);
                    }
                }
                catch (deleteError) {
                    console.warn('Could not delete old image from Cloudinary:', deleteError);
                }
            }
        }
        // Parse JSON fields if they exist
        if (updates.variations && typeof updates.variations === 'string') {
            updates.variations = JSON.parse(updates.variations);
        }
        if (updates.addOns && typeof updates.addOns === 'string') {
            updates.addOns = JSON.parse(updates.addOns);
        }
        if (updates.printToKitchen && typeof updates.printToKitchen === 'string') {
            updates.printToKitchen = JSON.parse(updates.printToKitchen);
        }
        const menuItem = await MenuItem_1.default.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        res.json(menuItem);
    }
    catch (error) {
        console.error('Update menu item error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateMenuItem = updateMenuItem;
const deleteMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const menuItem = await MenuItem_1.default.findByIdAndDelete(id);
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        res.json({ message: 'Menu item deleted successfully' });
    }
    catch (error) {
        console.error('Delete menu item error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteMenuItem = deleteMenuItem;
// Link stock items (ingredients) to a menu item
const linkRecipeToMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { recipe, trackStock } = req.body;
        if (!recipe || !Array.isArray(recipe)) {
            return res.status(400).json({
                message: 'Recipe array is required'
            });
        }
        // Validate all stock items exist
        for (const recipeItem of recipe) {
            if (!recipeItem.stockItemId || recipeItem.quantity === undefined) {
                return res.status(400).json({
                    message: 'Each recipe item must have stockItemId and quantity'
                });
            }
            const stockItem = await StockItem_1.default.findById(recipeItem.stockItemId);
            if (!stockItem) {
                return res.status(404).json({
                    message: `Stock item with ID ${recipeItem.stockItemId} not found`
                });
            }
        }
        const menuItem = await MenuItem_1.default.findByIdAndUpdate(id, {
            recipe,
            trackStock: trackStock !== undefined ? trackStock : recipe.length > 0
        }, { new: true }).populate('recipe.stockItemId');
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        res.json({
            message: 'Recipe linked successfully',
            menuItem
        });
    }
    catch (error) {
        console.error('Link recipe error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.linkRecipeToMenuItem = linkRecipeToMenuItem;
// Get menu item with populated recipe ingredients
const getMenuItemWithRecipe = async (req, res) => {
    try {
        const { id } = req.params;
        const menuItem = await MenuItem_1.default.findById(id).populate('recipe.stockItemId');
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        res.json(menuItem);
    }
    catch (error) {
        console.error('Get menu item with recipe error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getMenuItemWithRecipe = getMenuItemWithRecipe;
// Get all active stock items for recipe linking
const getAvailableIngredients = async (req, res) => {
    try {
        console.log('📥 GET /api/menu/ingredients/available - Fetching stock items...');
        // First, check total count of stock items
        const totalCount = await StockItem_1.default.countDocuments();
        const activeCount = await StockItem_1.default.countDocuments({ isActive: true });
        console.log(`📊 Stock items in DB: Total=${totalCount}, Active=${activeCount}`);
        // Get all active stock items
        const stockItems = await StockItem_1.default.find({ isActive: true })
            .select('name category quantity unit costPerUnit minThreshold isActive')
            .sort({ category: 1, name: 1 });
        console.log(`✅ Returning ${stockItems.length} active stock items`);
        console.log('📦 Stock items:', stockItems.map(item => ({
            name: item.name,
            isActive: item.isActive,
            quantity: item.quantity
        })));
        res.json(stockItems);
    }
    catch (error) {
        console.error('❌ Get available ingredients error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAvailableIngredients = getAvailableIngredients;
// Update stock tracking for menu item
const updateStockTracking = async (req, res) => {
    try {
        const { id } = req.params;
        const { trackStock } = req.body;
        if (trackStock === undefined) {
            return res.status(400).json({
                message: 'trackStock field is required'
            });
        }
        const menuItem = await MenuItem_1.default.findByIdAndUpdate(id, { trackStock }, { new: true });
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        res.json({
            message: `Stock tracking ${trackStock ? 'enabled' : 'disabled'} successfully`,
            menuItem
        });
    }
    catch (error) {
        console.error('Update stock tracking error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateStockTracking = updateStockTracking;
