"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkStockAvailability = checkStockAvailability;
exports.deductStockForOrder = deductStockForOrder;
exports.reverseStockDeduction = reverseStockDeduction;
exports.getStockUsageStats = getStockUsageStats;
const mongoose_1 = __importDefault(require("mongoose"));
const StockItem_1 = __importDefault(require("../models/StockItem"));
const StockTransaction_1 = __importDefault(require("../models/StockTransaction"));
const MenuItem_1 = __importDefault(require("../models/MenuItem"));
/**
 * Check if sufficient stock is available for all order items
 */
async function checkStockAvailability(orderItems) {
    try {
        const insufficientItems = [];
        // Aggregate stock requirements across all order items
        const stockRequirements = new Map();
        for (const orderItem of orderItems) {
            const menuItem = await MenuItem_1.default.findById(orderItem.itemId).populate('recipe.stockItemId');
            if (!menuItem) {
                return {
                    success: false,
                    message: `Menu item with ID ${orderItem.itemId} not found`
                };
            }
            // Skip if stock tracking is disabled for this menu item
            if (!menuItem.trackStock || !menuItem.recipe || menuItem.recipe.length === 0) {
                continue;
            }
            // Calculate required quantities for each stock item in the recipe
            for (const recipeItem of menuItem.recipe) {
                const stockId = recipeItem.stockItemId._id.toString();
                const requiredQty = recipeItem.quantity * orderItem.quantity;
                const existing = stockRequirements.get(stockId);
                if (existing) {
                    stockRequirements.set(stockId, {
                        quantity: existing.quantity + requiredQty,
                        menuItemName: menuItem.name
                    });
                }
                else {
                    stockRequirements.set(stockId, {
                        quantity: requiredQty,
                        menuItemName: menuItem.name
                    });
                }
            }
        }
        // Check stock availability
        for (const [stockId, requirement] of stockRequirements.entries()) {
            const stockItem = await StockItem_1.default.findById(stockId);
            if (!stockItem) {
                return {
                    success: false,
                    message: `Stock item with ID ${stockId} not found`
                };
            }
            if (stockItem.quantity < requirement.quantity) {
                insufficientItems.push({
                    itemName: requirement.menuItemName,
                    stockName: stockItem.name,
                    required: requirement.quantity,
                    available: stockItem.quantity,
                    unit: stockItem.unit
                });
            }
        }
        if (insufficientItems.length > 0) {
            return {
                success: false,
                message: 'Insufficient stock for some items',
                insufficientItems
            };
        }
        return {
            success: true,
            message: 'Sufficient stock available'
        };
    }
    catch (error) {
        console.error('Error checking stock availability:', error);
        return {
            success: false,
            message: `Error checking stock: ${error.message}`
        };
    }
}
/**
 * Deduct stock for completed order using MongoDB transactions
 */
async function deductStockForOrder(orderItems, orderId, userId) {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        // First check if stock is available
        const availabilityCheck = await checkStockAvailability(orderItems);
        if (!availabilityCheck.success) {
            await session.abortTransaction();
            return availabilityCheck;
        }
        const deductions = [];
        let totalCOGS = 0;
        // Aggregate stock requirements
        const stockRequirements = new Map();
        for (const orderItem of orderItems) {
            const menuItem = await MenuItem_1.default.findById(orderItem.itemId).session(session);
            if (!menuItem) {
                throw new Error(`Menu item with ID ${orderItem.itemId} not found`);
            }
            // Skip if stock tracking is disabled
            if (!menuItem.trackStock || !menuItem.recipe || menuItem.recipe.length === 0) {
                continue;
            }
            // Calculate required quantities
            for (const recipeItem of menuItem.recipe) {
                const stockId = recipeItem.stockItemId.toString();
                const requiredQty = recipeItem.quantity * orderItem.quantity;
                const existing = stockRequirements.get(stockId);
                if (existing) {
                    stockRequirements.set(stockId, {
                        quantity: existing.quantity + requiredQty,
                        menuItemName: menuItem.name,
                        recipeItem
                    });
                }
                else {
                    stockRequirements.set(stockId, {
                        quantity: requiredQty,
                        menuItemName: menuItem.name,
                        recipeItem
                    });
                }
            }
        }
        // Deduct stock atomically
        for (const [stockId, requirement] of stockRequirements.entries()) {
            const stockItem = await StockItem_1.default.findById(stockId).session(session);
            if (!stockItem) {
                throw new Error(`Stock item with ID ${stockId} not found`);
            }
            // Final check before deduction
            if (stockItem.quantity < requirement.quantity) {
                throw new Error(`Insufficient stock for ${stockItem.name}. Required: ${requirement.quantity}, Available: ${stockItem.quantity}`);
            }
            // Deduct stock
            const previousQuantity = stockItem.quantity;
            stockItem.quantity -= requirement.quantity;
            await stockItem.save({ session });
            // Calculate COGS
            const cogs = requirement.quantity * stockItem.costPerUnit;
            totalCOGS += cogs;
            // Create transaction record
            await StockTransaction_1.default.create([
                {
                    stockItemId: stockItem._id,
                    type: 'outflow',
                    quantity: -requirement.quantity, // Negative for outflow
                    reason: 'order_deduction',
                    notes: `Auto-deducted for order ${orderId}`,
                    userId,
                    orderId,
                    costPerUnit: stockItem.costPerUnit,
                    totalCost: cogs,
                    balanceAfter: stockItem.quantity,
                    date: new Date()
                }
            ], { session });
            deductions.push({
                stockItemId: stockItem._id,
                stockName: stockItem.name,
                quantityDeducted: requirement.quantity,
                unit: stockItem.unit,
                costOfGoodsSold: cogs
            });
            console.log(`Deducted ${requirement.quantity} ${stockItem.unit} of ${stockItem.name}. Previous: ${previousQuantity}, New: ${stockItem.quantity}`);
        }
        // Commit transaction
        await session.commitTransaction();
        return {
            success: true,
            message: `Successfully deducted stock for ${deductions.length} ingredient(s)`,
            deductions,
            totalCOGS
        };
    }
    catch (error) {
        await session.abortTransaction();
        console.error('Error deducting stock:', error);
        return {
            success: false,
            message: `Error deducting stock: ${error.message}`
        };
    }
    finally {
        session.endSession();
    }
}
/**
 * Reverse stock deduction (for order cancellation)
 */
async function reverseStockDeduction(orderId, userId) {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        // Find all transactions for this order
        const transactions = await StockTransaction_1.default.find({
            orderId,
            type: 'outflow',
            reason: 'order_deduction'
        }).session(session);
        if (transactions.length === 0) {
            await session.abortTransaction();
            return {
                success: false,
                message: 'No stock transactions found for this order'
            };
        }
        const reversals = [];
        let totalCOGS = 0;
        // Reverse each transaction
        for (const transaction of transactions) {
            const stockItem = await StockItem_1.default.findById(transaction.stockItemId).session(session);
            if (!stockItem) {
                throw new Error(`Stock item with ID ${transaction.stockItemId} not found`);
            }
            // Add back the deducted quantity
            const quantityToReverse = Math.abs(transaction.quantity);
            stockItem.quantity += quantityToReverse;
            await stockItem.save({ session });
            const cogs = quantityToReverse * (transaction.costPerUnit || stockItem.costPerUnit);
            totalCOGS += cogs;
            // Create reversal transaction
            await StockTransaction_1.default.create([
                {
                    stockItemId: stockItem._id,
                    type: 'inflow',
                    quantity: quantityToReverse,
                    reason: 'return',
                    notes: `Reversed deduction for cancelled order ${orderId}`,
                    userId,
                    orderId,
                    costPerUnit: transaction.costPerUnit || stockItem.costPerUnit,
                    totalCost: cogs,
                    balanceAfter: stockItem.quantity,
                    date: new Date()
                }
            ], { session });
            reversals.push({
                stockItemId: stockItem._id,
                stockName: stockItem.name,
                quantityDeducted: quantityToReverse,
                unit: stockItem.unit,
                costOfGoodsSold: cogs
            });
        }
        await session.commitTransaction();
        return {
            success: true,
            message: `Successfully reversed stock deduction for ${reversals.length} ingredient(s)`,
            deductions: reversals,
            totalCOGS
        };
    }
    catch (error) {
        await session.abortTransaction();
        console.error('Error reversing stock deduction:', error);
        return {
            success: false,
            message: `Error reversing stock deduction: ${error.message}`
        };
    }
    finally {
        session.endSession();
    }
}
/**
 * Get stock usage statistics for reporting
 */
async function getStockUsageStats(startDate, endDate) {
    try {
        const usageStats = await StockTransaction_1.default.aggregate([
            {
                $match: {
                    type: 'outflow',
                    reason: 'order_deduction',
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: '$stockItemId',
                    totalQuantityUsed: { $sum: { $abs: '$quantity' } },
                    totalCost: { $sum: { $abs: '$totalCost' } },
                    usageCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'stockitems',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'stockItem'
                }
            },
            {
                $unwind: '$stockItem'
            },
            {
                $project: {
                    stockItemId: '$_id',
                    stockName: '$stockItem.name',
                    category: '$stockItem.category',
                    unit: '$stockItem.unit',
                    totalQuantityUsed: 1,
                    totalCost: 1,
                    usageCount: 1,
                    averageQuantityPerUse: {
                        $divide: ['$totalQuantityUsed', '$usageCount']
                    }
                }
            },
            {
                $sort: { totalCost: -1 }
            }
        ]);
        return {
            success: true,
            data: usageStats
        };
    }
    catch (error) {
        console.error('Error getting stock usage stats:', error);
        return {
            success: false,
            message: `Error: ${error.message}`
        };
    }
}
