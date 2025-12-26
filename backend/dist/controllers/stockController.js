"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardSummary = exports.getReorderSuggestions = exports.getTransactionHistory = exports.getStockValuation = exports.getExpiringItems = exports.getLowStockAlerts = exports.checkAvailability = exports.adjustStock = exports.recordPurchase = exports.deleteStockItem = exports.updateStockItem = exports.createStockItem = exports.getStockItemById = exports.getStockItems = void 0;
const StockItem_1 = __importDefault(require("../models/StockItem"));
const stockService_1 = require("../services/stockService");
/**
 * Get all stock items with filtering, search, and pagination
 */
const getStockItems = async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '', category = '', lowStock = '', sortBy = 'name', sortOrder = 'asc' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // Build query
        const query = { isActive: true };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (category) {
            query.category = category;
        }
        // Get items
        let items = await StockItem_1.default.find(query)
            .populate('supplierId', 'name contact email')
            .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
            .skip(skip)
            .limit(limitNum);
        // Filter for low stock if requested
        if (lowStock === 'true') {
            items = items.filter((item) => item.quantity <= item.minThreshold);
        }
        const total = await StockItem_1.default.countDocuments(query);
        res.json({
            items,
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(total / limitNum),
                totalItems: total,
                itemsPerPage: limitNum
            }
        });
    }
    catch (error) {
        console.error('Get stock items error:', error);
        res.status(500).json({ message: 'Failed to fetch stock items', error: error.message });
    }
};
exports.getStockItems = getStockItems;
/**
 * Get single stock item by ID
 */
const getStockItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await StockItem_1.default.findById(id).populate('supplierId');
        if (!item) {
            return res.status(404).json({ message: 'Stock item not found' });
        }
        res.json(item);
    }
    catch (error) {
        console.error('Get stock item error:', error);
        res.status(500).json({ message: 'Failed to fetch stock item', error: error.message });
    }
};
exports.getStockItemById = getStockItemById;
/**
 * Create new stock item
 */
const createStockItem = async (req, res) => {
    try {
        const stockItem = new StockItem_1.default(req.body);
        await stockItem.save();
        const populatedItem = await StockItem_1.default.findById(stockItem._id).populate('supplierId');
        res.status(201).json({
            message: 'Stock item created successfully',
            item: populatedItem
        });
    }
    catch (error) {
        console.error('Create stock item error:', error);
        res.status(400).json({ message: 'Failed to create stock item', error: error.message });
    }
};
exports.createStockItem = createStockItem;
/**
 * Update stock item
 */
const updateStockItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        // Don't allow direct quantity updates (use transactions instead)
        delete updates.quantity;
        const item = await StockItem_1.default.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true
        }).populate('supplierId');
        if (!item) {
            return res.status(404).json({ message: 'Stock item not found' });
        }
        res.json({
            message: 'Stock item updated successfully',
            item
        });
    }
    catch (error) {
        console.error('Update stock item error:', error);
        res.status(400).json({ message: 'Failed to update stock item', error: error.message });
    }
};
exports.updateStockItem = updateStockItem;
/**
 * Delete stock item (soft delete)
 */
const deleteStockItem = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await StockItem_1.default.findByIdAndUpdate(id, { isActive: false }, { new: true });
        if (!item) {
            return res.status(404).json({ message: 'Stock item not found' });
        }
        res.json({
            message: 'Stock item deleted successfully',
            item
        });
    }
    catch (error) {
        console.error('Delete stock item error:', error);
        res.status(500).json({ message: 'Failed to delete stock item', error: error.message });
    }
};
exports.deleteStockItem = deleteStockItem;
/**
 * Record stock purchase (inflow)
 */
const recordPurchase = async (req, res) => {
    try {
        const { stockItemId, quantity, costPerUnit, notes, expenseId } = req.body;
        const userId = req.user.id;
        if (!stockItemId || !quantity || !costPerUnit) {
            return res.status(400).json({ message: 'Stock item, quantity, and cost are required' });
        }
        const result = await stockService_1.stockService.addStock(stockItemId, quantity, costPerUnit, userId, 'purchase', notes, expenseId);
        res.json({
            message: 'Stock purchase recorded successfully',
            stockItem: result.stockItem,
            transaction: result.transaction
        });
    }
    catch (error) {
        console.error('Record purchase error:', error);
        res.status(400).json({ message: 'Failed to record purchase', error: error.message });
    }
};
exports.recordPurchase = recordPurchase;
/**
 * Adjust stock (waste, spoilage, corrections)
 */
const adjustStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantityChange, reason, notes } = req.body;
        const userId = req.user.id;
        if (quantityChange === undefined || !reason) {
            return res.status(400).json({ message: 'Quantity change and reason are required' });
        }
        const result = await stockService_1.stockService.adjustStock(id, quantityChange, userId, reason, notes);
        res.json({
            message: 'Stock adjusted successfully',
            stockItem: result.stockItem,
            transaction: result.transaction
        });
    }
    catch (error) {
        console.error('Adjust stock error:', error);
        res.status(400).json({ message: 'Failed to adjust stock', error: error.message });
    }
};
exports.adjustStock = adjustStock;
/**
 * Check stock availability for items
 */
const checkAvailability = async (req, res) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Items array is required' });
        }
        const availability = await stockService_1.stockService.checkStockAvailability(items);
        const allAvailable = availability.every((item) => item.available);
        res.json({
            allAvailable,
            items: availability
        });
    }
    catch (error) {
        console.error('Check availability error:', error);
        res.status(500).json({ message: 'Failed to check availability', error: error.message });
    }
};
exports.checkAvailability = checkAvailability;
/**
 * Get low stock alerts
 */
const getLowStockAlerts = async (req, res) => {
    try {
        const items = await stockService_1.stockService.getLowStockItems();
        res.json({
            count: items.length,
            items
        });
    }
    catch (error) {
        console.error('Get low stock alerts error:', error);
        res.status(500).json({ message: 'Failed to fetch low stock alerts', error: error.message });
    }
};
exports.getLowStockAlerts = getLowStockAlerts;
/**
 * Get expiring items
 */
const getExpiringItems = async (req, res) => {
    try {
        const { daysAhead = 7 } = req.query;
        const items = await stockService_1.stockService.getExpiringItems(parseInt(daysAhead));
        res.json({
            count: items.length,
            items
        });
    }
    catch (error) {
        console.error('Get expiring items error:', error);
        res.status(500).json({ message: 'Failed to fetch expiring items', error: error.message });
    }
};
exports.getExpiringItems = getExpiringItems;
/**
 * Get stock valuation
 */
const getStockValuation = async (req, res) => {
    try {
        const valuation = await stockService_1.stockService.getStockValuation();
        res.json(valuation);
    }
    catch (error) {
        console.error('Get stock valuation error:', error);
        res.status(500).json({ message: 'Failed to calculate stock valuation', error: error.message });
    }
};
exports.getStockValuation = getStockValuation;
/**
 * Get transaction history
 */
const getTransactionHistory = async (req, res) => {
    try {
        const { stockItemId, startDate, endDate, type, limit = 100 } = req.query;
        const transactions = await stockService_1.stockService.getTransactionHistory(stockItemId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined, type, parseInt(limit));
        res.json({
            count: transactions.length,
            transactions
        });
    }
    catch (error) {
        console.error('Get transaction history error:', error);
        res.status(500).json({ message: 'Failed to fetch transaction history', error: error.message });
    }
};
exports.getTransactionHistory = getTransactionHistory;
/**
 * Get reorder suggestions
 */
const getReorderSuggestions = async (req, res) => {
    try {
        const { daysBack = 30 } = req.query;
        const suggestions = await stockService_1.stockService.getReorderSuggestions(parseInt(daysBack));
        res.json({
            count: suggestions.length,
            suggestions
        });
    }
    catch (error) {
        console.error('Get reorder suggestions error:', error);
        res.status(500).json({ message: 'Failed to generate reorder suggestions', error: error.message });
    }
};
exports.getReorderSuggestions = getReorderSuggestions;
/**
 * Get stock dashboard summary
 */
const getDashboardSummary = async (req, res) => {
    try {
        const [totalItems, lowStockItems, expiringItems, valuation] = await Promise.all([
            StockItem_1.default.countDocuments({ isActive: true }),
            stockService_1.stockService.getLowStockItems(),
            stockService_1.stockService.getExpiringItems(7),
            stockService_1.stockService.getStockValuation()
        ]);
        const categoryCount = await StockItem_1.default.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
        res.json({
            totalItems,
            lowStockCount: lowStockItems.length,
            expiringCount: expiringItems.length,
            totalValuation: valuation.totalValue,
            categoryBreakdown: valuation.categoryBreakdown,
            categoryCounts: categoryCount
        });
    }
    catch (error) {
        console.error('Get dashboard summary error:', error);
        res.status(500).json({ message: 'Failed to fetch dashboard summary', error: error.message });
    }
};
exports.getDashboardSummary = getDashboardSummary;
