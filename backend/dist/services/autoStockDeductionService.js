"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deductAutoStockOnOrderCreation = deductAutoStockOnOrderCreation;
exports.reverseAutoStockDeduction = reverseAutoStockDeduction;
exports.checkAutoStockAvailability = checkAutoStockAvailability;
const mongoose_1 = __importDefault(require("mongoose"));
const StockItem_1 = __importDefault(require("../models/StockItem"));
const StockTransaction_1 = __importDefault(require("../models/StockTransaction"));
const MenuItem_1 = __importDefault(require("../models/MenuItem"));
/**
 * Deduct automatic stock items (drinks, cigarettes) immediately on order creation
 * This is called right after order is created, not at billing
 */
async function deductAutoStockOnOrderCreation(orderItems, orderId, userId) {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const deductions = [];
        const errors = [];
        let totalCOGS = 0;
        // Process each order item
        for (const orderItem of orderItems) {
            // Skip cancelled items
            if (orderItem.status === 'cancelled') {
                continue;
            }
            // Get menu item with recipe populated
            const menuItem = await MenuItem_1.default.findById(orderItem.itemId)
                .populate('recipe.stockItemId')
                .session(session);
            if (!menuItem) {
                errors.push(`Menu item ${orderItem.itemId} not found`);
                continue;
            }
            // Skip if stock tracking is disabled
            if (!menuItem.trackStock || !menuItem.recipe || menuItem.recipe.length === 0) {
                continue;
            }
            // Process each recipe item (stock ingredient)
            for (const recipeItem of menuItem.recipe) {
                const stockItem = recipeItem.stockItemId;
                // Only process automatic deduction items
                if (stockItem.deductionType !== 'automatic') {
                    continue;
                }
                const quantityNeeded = recipeItem.quantity * orderItem.quantity;
                // Check if sufficient stock is available
                const currentStockItem = await StockItem_1.default.findById(stockItem._id).session(session);
                if (!currentStockItem) {
                    errors.push(`Stock item ${stockItem.name} not found`);
                    continue;
                }
                if (currentStockItem.quantity < quantityNeeded) {
                    errors.push(`Insufficient stock for ${stockItem.name}. Required: ${quantityNeeded} ${stockItem.unit}, Available: ${currentStockItem.quantity} ${stockItem.unit}`);
                    continue;
                }
                // Deduct stock
                const previousQuantity = currentStockItem.quantity;
                currentStockItem.quantity -= quantityNeeded;
                await currentStockItem.save({ session });
                // Calculate COGS
                const cogs = quantityNeeded * currentStockItem.costPerUnit;
                totalCOGS += cogs;
                // Create transaction record
                await StockTransaction_1.default.create([
                    {
                        stockItemId: currentStockItem._id,
                        type: 'outflow',
                        quantity: -quantityNeeded, // Negative for outflow
                        reason: 'order_deduction',
                        notes: `Auto deduction on order creation for order ${orderId}`,
                        userId,
                        orderId,
                        costPerUnit: currentStockItem.costPerUnit,
                        totalCost: cogs,
                        balanceAfter: currentStockItem.quantity,
                        date: new Date()
                    }
                ], { session });
                deductions.push({
                    stockItemId: currentStockItem._id,
                    stockName: currentStockItem.name,
                    quantityDeducted: quantityNeeded,
                    unit: currentStockItem.unit,
                    costOfGoodsSold: cogs
                });
                console.log(`[Auto Deduction] Deducted ${quantityNeeded} ${stockItem.unit} of ${stockItem.name}. Previous: ${previousQuantity}, New: ${currentStockItem.quantity}`);
            }
        }
        // If there are errors, rollback
        if (errors.length > 0) {
            await session.abortTransaction();
            return {
                success: false,
                message: 'Failed to deduct some stock items',
                errors
            };
        }
        // Commit transaction
        await session.commitTransaction();
        return {
            success: true,
            message: deductions.length > 0
                ? `Successfully deducted ${deductions.length} automatic stock item(s) on order creation`
                : 'No automatic stock items to deduct',
            deductions,
            totalCOGS
        };
    }
    catch (error) {
        await session.abortTransaction();
        console.error('Error deducting automatic stock on order creation:', error);
        return {
            success: false,
            message: `Error deducting automatic stock: ${error.message}`,
            errors: [error.message]
        };
    }
    finally {
        session.endSession();
    }
}
/**
 * Reverse automatic stock deduction (for order cancellation before billing)
 */
async function reverseAutoStockDeduction(orderId, userId) {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        // Find all automatic deduction transactions for this order
        const transactions = await StockTransaction_1.default.find({
            orderId,
            type: 'outflow',
            reason: 'order_deduction',
            notes: { $regex: 'Auto deduction on order creation' }
        }).session(session);
        if (transactions.length === 0) {
            await session.abortTransaction();
            return {
                success: false,
                message: 'No automatic stock transactions found for this order'
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
                    notes: `Reversed auto deduction for cancelled order ${orderId}`,
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
            console.log(`[Auto Reversal] Restored ${quantityToReverse} ${stockItem.unit} of ${stockItem.name}. New balance: ${stockItem.quantity}`);
        }
        await session.commitTransaction();
        return {
            success: true,
            message: `Successfully reversed ${reversals.length} automatic stock deduction(s)`,
            deductions: reversals,
            totalCOGS
        };
    }
    catch (error) {
        await session.abortTransaction();
        console.error('Error reversing automatic stock deduction:', error);
        return {
            success: false,
            message: `Error reversing automatic stock deduction: ${error.message}`,
            errors: [error.message]
        };
    }
    finally {
        session.endSession();
    }
}
/**
 * Check if automatic stock is available before order creation
 */
async function checkAutoStockAvailability(orderItems) {
    try {
        const insufficientItems = [];
        for (const orderItem of orderItems) {
            const menuItem = await MenuItem_1.default.findById(orderItem.itemId)
                .populate('recipe.stockItemId');
            if (!menuItem || !menuItem.trackStock || !menuItem.recipe || menuItem.recipe.length === 0) {
                continue;
            }
            for (const recipeItem of menuItem.recipe) {
                const stockItem = recipeItem.stockItemId;
                // Only check automatic items
                if (stockItem.deductionType !== 'automatic') {
                    continue;
                }
                const quantityNeeded = recipeItem.quantity * orderItem.quantity;
                if (stockItem.quantity < quantityNeeded) {
                    insufficientItems.push({
                        itemName: menuItem.name,
                        stockName: stockItem.name,
                        required: quantityNeeded,
                        available: stockItem.quantity,
                        unit: stockItem.unit
                    });
                }
            }
        }
        if (insufficientItems.length > 0) {
            return {
                success: false,
                message: 'Insufficient automatic stock for some items',
                insufficientItems
            };
        }
        return {
            success: true,
            message: 'Sufficient automatic stock available'
        };
    }
    catch (error) {
        console.error('Error checking automatic stock availability:', error);
        return {
            success: false,
            message: `Error checking stock: ${error.message}`
        };
    }
}
