"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockService = exports.StockService = void 0;
const StockItem_1 = __importDefault(require("../models/StockItem"));
const StockTransaction_1 = __importDefault(require("../models/StockTransaction"));
const mongoose_1 = __importDefault(require("mongoose"));
const socket_1 = require("../utils/socket");
class StockService {
    /**
     * Add stock (inflow) - for purchases
     */
    async addStock(stockItemId, quantity, costPerUnit, userId, reason = 'purchase', notes, expenseId) {
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            const stockItem = await StockItem_1.default.findById(stockItemId).session(session);
            if (!stockItem) {
                throw new Error('Stock item not found');
            }
            // Update stock quantity
            stockItem.quantity += quantity;
            stockItem.costPerUnit = costPerUnit; // Update with latest cost
            await stockItem.save({ session });
            // Create transaction record
            const transaction = new StockTransaction_1.default({
                stockItemId,
                type: 'inflow',
                quantity,
                reason,
                notes,
                userId,
                expenseId: expenseId ? new mongoose_1.default.Types.ObjectId(expenseId) : undefined,
                costPerUnit,
                totalCost: quantity * costPerUnit,
                balanceAfter: stockItem.quantity,
                date: new Date()
            });
            await transaction.save({ session });
            await session.commitTransaction();
            // Emit real-time update
            this.emitStockUpdate(stockItemId, 'stock_updated');
            return { stockItem, transaction };
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    /**
     * Deduct stock (outflow) - for orders or usage
     */
    async deductStock(stockItemId, quantity, userId, reason = 'order_deduction', notes, orderId) {
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            const stockItem = await StockItem_1.default.findById(stockItemId).session(session);
            if (!stockItem) {
                throw new Error('Stock item not found');
            }
            if (stockItem.quantity < quantity) {
                throw new Error(`Insufficient stock. Available: ${stockItem.quantity}, Required: ${quantity}`);
            }
            // Update stock quantity
            stockItem.quantity -= quantity;
            await stockItem.save({ session });
            // Create transaction record
            const transaction = new StockTransaction_1.default({
                stockItemId,
                type: 'outflow',
                quantity: -quantity, // Negative for outflow
                reason,
                notes,
                userId,
                orderId: orderId ? new mongoose_1.default.Types.ObjectId(orderId) : undefined,
                balanceAfter: stockItem.quantity,
                date: new Date()
            });
            await transaction.save({ session });
            await session.commitTransaction();
            // Emit real-time update
            this.emitStockUpdate(stockItemId, 'stock_updated');
            // Check if stock is low and emit alert
            if (stockItem.quantity <= stockItem.minThreshold) {
                this.emitStockUpdate(stockItemId, 'low_stock_alert');
            }
            return { stockItem, transaction };
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    /**
     * Adjust stock - for waste, spoilage, corrections
     */
    async adjustStock(stockItemId, quantityChange, userId, reason, notes) {
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            const stockItem = await StockItem_1.default.findById(stockItemId).session(session);
            if (!stockItem) {
                throw new Error('Stock item not found');
            }
            const newQuantity = stockItem.quantity + quantityChange;
            if (newQuantity < 0) {
                throw new Error('Adjustment would result in negative stock');
            }
            // Update stock quantity
            stockItem.quantity = newQuantity;
            await stockItem.save({ session });
            // Create transaction record
            const transaction = new StockTransaction_1.default({
                stockItemId,
                type: 'adjustment',
                quantity: quantityChange,
                reason,
                notes,
                userId,
                balanceAfter: stockItem.quantity,
                date: new Date()
            });
            await transaction.save({ session });
            await session.commitTransaction();
            // Emit real-time update
            this.emitStockUpdate(stockItemId, 'stock_updated');
            return { stockItem, transaction };
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    /**
     * Batch deduct stock for multiple items (used by orders)
     */
    async batchDeductStock(items, userId, orderId, reason = 'order_deduction') {
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            const results = [];
            for (const item of items) {
                const stockItem = await StockItem_1.default.findById(item.stockItemId).session(session);
                if (!stockItem) {
                    throw new Error(`Stock item ${item.stockItemId} not found`);
                }
                if (stockItem.quantity < item.quantity) {
                    throw new Error(`Insufficient stock for ${stockItem.name}. Available: ${stockItem.quantity}, Required: ${item.quantity}`);
                }
                // Update stock quantity
                stockItem.quantity -= item.quantity;
                await stockItem.save({ session });
                // Create transaction record
                const transaction = new StockTransaction_1.default({
                    stockItemId: item.stockItemId,
                    type: 'outflow',
                    quantity: -item.quantity,
                    reason,
                    userId,
                    orderId: new mongoose_1.default.Types.ObjectId(orderId),
                    balanceAfter: stockItem.quantity,
                    date: new Date()
                });
                await transaction.save({ session });
                results.push({ stockItem, transaction });
                // Check for low stock
                if (stockItem.quantity <= stockItem.minThreshold) {
                    this.emitStockUpdate(item.stockItemId, 'low_stock_alert');
                }
            }
            await session.commitTransaction();
            // Emit batch update
            try {
                const io = (0, socket_1.getIO)();
                if (io) {
                    io.emit('stock_batch_updated', { orderId, itemsCount: items.length });
                }
            }
            catch (error) {
                console.log('Socket.IO not initialized, skipping batch update event');
            }
            return results;
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    /**
     * Check stock availability for multiple items
     */
    async checkStockAvailability(items) {
        const availability = [];
        for (const item of items) {
            const stockItem = await StockItem_1.default.findById(item.stockItemId);
            if (!stockItem) {
                availability.push({
                    stockItemId: item.stockItemId,
                    available: false,
                    reason: 'Item not found',
                    currentQuantity: 0,
                    requiredQuantity: item.quantity
                });
                continue;
            }
            const isAvailable = stockItem.quantity >= item.quantity;
            availability.push({
                stockItemId: item.stockItemId,
                itemName: stockItem.name,
                available: isAvailable,
                reason: isAvailable ? 'Available' : 'Insufficient stock',
                currentQuantity: stockItem.quantity,
                requiredQuantity: item.quantity,
                shortfall: isAvailable ? 0 : item.quantity - stockItem.quantity
            });
        }
        return availability;
    }
    /**
     * Get low stock items
     */
    async getLowStockItems() {
        const items = await StockItem_1.default.find({ isActive: true })
            .populate('supplierId')
            .lean();
        return items.filter((item) => item.quantity <= item.minThreshold);
    }
    /**
     * Get expired or expiring soon items
     */
    async getExpiringItems(daysAhead = 7) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);
        const items = await StockItem_1.default.find({
            isActive: true,
            expirationDate: { $exists: true, $lte: futureDate }
        })
            .populate('supplierId')
            .sort({ expirationDate: 1 });
        return items;
    }
    /**
     * Get stock valuation
     */
    async getStockValuation() {
        const items = await StockItem_1.default.find({ isActive: true });
        let totalValue = 0;
        const categoryBreakdown = {};
        items.forEach((item) => {
            const value = item.quantity * item.costPerUnit;
            totalValue += value;
            if (!categoryBreakdown[item.category]) {
                categoryBreakdown[item.category] = 0;
            }
            categoryBreakdown[item.category] += value;
        });
        return {
            totalValue,
            totalItems: items.length,
            categoryBreakdown
        };
    }
    /**
     * Get stock transaction history
     */
    async getTransactionHistory(stockItemId, startDate, endDate, type, limit = 100) {
        const query = {};
        if (stockItemId) {
            query.stockItemId = stockItemId;
        }
        if (startDate || endDate) {
            query.date = {};
            if (startDate)
                query.date.$gte = startDate;
            if (endDate)
                query.date.$lte = endDate;
        }
        if (type) {
            query.type = type;
        }
        const transactions = await StockTransaction_1.default.find(query)
            .populate('stockItemId', 'name unit category')
            .populate('userId', 'name email')
            .populate('orderId', 'orderNumber')
            .sort({ date: -1 })
            .limit(limit);
        return transactions;
    }
    /**
     * Emit real-time stock updates
     */
    emitStockUpdate(stockItemId, event) {
        try {
            const io = (0, socket_1.getIO)();
            if (io) {
                io.emit(event, { stockItemId, timestamp: new Date() });
            }
        }
        catch (error) {
            // Socket.IO not initialized, skip real-time update
            console.log('Socket.IO not initialized, skipping real-time update');
        }
    }
    /**
     * Calculate reorder suggestions based on usage
     */
    async getReorderSuggestions(daysBack = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        const items = await StockItem_1.default.find({ isActive: true });
        const suggestions = [];
        for (const item of items) {
            const transactions = await StockTransaction_1.default.find({
                stockItemId: item._id,
                type: 'outflow',
                date: { $gte: startDate }
            });
            const totalUsed = transactions.reduce((sum, t) => sum + Math.abs(t.quantity), 0);
            const avgDailyUsage = totalUsed / daysBack;
            const daysOfStockRemaining = item.quantity / (avgDailyUsage || 1);
            if (daysOfStockRemaining < 7 || item.quantity <= item.minThreshold) {
                const suggestedOrderQuantity = Math.ceil(avgDailyUsage * 14); // 2 weeks supply
                suggestions.push({
                    stockItem: item,
                    currentQuantity: item.quantity,
                    avgDailyUsage: avgDailyUsage.toFixed(2),
                    daysRemaining: daysOfStockRemaining.toFixed(1),
                    suggestedOrderQuantity,
                    priority: item.quantity <= item.minThreshold ? 'high' : 'medium'
                });
            }
        }
        return suggestions.sort((a, b) => {
            if (a.priority === 'high' && b.priority !== 'high')
                return -1;
            if (a.priority !== 'high' && b.priority === 'high')
                return 1;
            return parseFloat(a.daysRemaining) - parseFloat(b.daysRemaining);
        });
    }
}
exports.StockService = StockService;
exports.stockService = new StockService();
