"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deductManualStockOnBilling = deductManualStockOnBilling;
exports.reverseManualStockDeduction = reverseManualStockDeduction;
exports.validateManualStockQuantities = validateManualStockQuantities;
const mongoose_1 = __importDefault(require("mongoose"));
const StockItem_1 = __importDefault(require("../models/StockItem"));
const StockTransaction_1 = __importDefault(require("../models/StockTransaction"));
/**
 * Deduct manually-tracked stock items (meats) on billing
 * This is called when a bill is finalized, not when the order is created
 */
async function deductManualStockOnBilling(orderItems, orderId, userId) {
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
            // Skip if no stock items are tracked for this order item
            if (!orderItem.stockItemsUsed || orderItem.stockItemsUsed.length === 0) {
                continue;
            }
            // Process each stock item used in this order item
            for (const stockUsage of orderItem.stockItemsUsed) {
                // Only deduct manual items (meats) here
                // Automatic items (drinks, cigarettes) are deducted at order creation
                if (stockUsage.deductionType !== 'manual') {
                    continue;
                }
                const stockItem = await StockItem_1.default.findById(stockUsage.stockItemId).session(session);
                if (!stockItem) {
                    errors.push(`Stock item ${stockUsage.stockItemId} not found`);
                    continue;
                }
                // Check if sufficient stock is available
                if (stockItem.quantity < stockUsage.quantityUsed) {
                    errors.push(`Insufficient stock for ${stockItem.name}. Required: ${stockUsage.quantityUsed} ${stockItem.unit}, Available: ${stockItem.quantity} ${stockItem.unit}`);
                    continue;
                }
                // Deduct stock
                const previousQuantity = stockItem.quantity;
                stockItem.quantity -= stockUsage.quantityUsed;
                await stockItem.save({ session });
                // Calculate COGS
                const cogs = stockUsage.quantityUsed * stockUsage.costPerUnit;
                totalCOGS += cogs;
                // Create transaction record
                await StockTransaction_1.default.create([
                    {
                        stockItemId: stockItem._id,
                        type: 'outflow',
                        quantity: -stockUsage.quantityUsed, // Negative for outflow
                        reason: 'order_deduction',
                        notes: `Manual deduction on billing for order ${orderId}`,
                        userId,
                        orderId,
                        costPerUnit: stockUsage.costPerUnit,
                        totalCost: cogs,
                        balanceAfter: stockItem.quantity,
                        date: new Date()
                    }
                ], { session });
                deductions.push({
                    stockItemId: stockItem._id,
                    stockName: stockItem.name,
                    quantityDeducted: stockUsage.quantityUsed,
                    unit: stockItem.unit,
                    costOfGoodsSold: cogs
                });
                console.log(`[Manual Deduction] Deducted ${stockUsage.quantityUsed} ${stockItem.unit} of ${stockItem.name}. Previous: ${previousQuantity}, New: ${stockItem.quantity}`);
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
            message: `Successfully deducted ${deductions.length} manual stock item(s) on billing`,
            deductions,
            totalCOGS
        };
    }
    catch (error) {
        await session.abortTransaction();
        console.error('Error deducting manual stock on billing:', error);
        return {
            success: false,
            message: `Error deducting manual stock: ${error.message}`,
            errors: [error.message]
        };
    }
    finally {
        session.endSession();
    }
}
/**
 * Reverse manual stock deduction (for bill cancellation/refund)
 */
async function reverseManualStockDeduction(orderId, userId) {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        // Find all manual deduction transactions for this order
        const transactions = await StockTransaction_1.default.find({
            orderId,
            type: 'outflow',
            reason: 'order_deduction',
            notes: { $regex: 'Manual deduction on billing' }
        }).session(session);
        if (transactions.length === 0) {
            await session.abortTransaction();
            return {
                success: false,
                message: 'No manual stock transactions found for this order'
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
                    notes: `Reversed manual deduction for order ${orderId}`,
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
            console.log(`[Manual Reversal] Restored ${quantityToReverse} ${stockItem.unit} of ${stockItem.name}. New balance: ${stockItem.quantity}`);
        }
        await session.commitTransaction();
        return {
            success: true,
            message: `Successfully reversed ${reversals.length} manual stock deduction(s)`,
            deductions: reversals,
            totalCOGS
        };
    }
    catch (error) {
        await session.abortTransaction();
        console.error('Error reversing manual stock deduction:', error);
        return {
            success: false,
            message: `Error reversing manual stock deduction: ${error.message}`,
            errors: [error.message]
        };
    }
    finally {
        session.endSession();
    }
}
/**
 * Validate that all manual stock items have quantities entered
 */
function validateManualStockQuantities(orderItems) {
    const missingItems = [];
    for (const orderItem of orderItems) {
        if (orderItem.status === 'cancelled') {
            continue;
        }
        if (!orderItem.stockItemsUsed || orderItem.stockItemsUsed.length === 0) {
            continue;
        }
        for (const stockUsage of orderItem.stockItemsUsed) {
            if (stockUsage.deductionType === 'manual') {
                if (!stockUsage.quantityUsed || stockUsage.quantityUsed <= 0) {
                    missingItems.push(`Missing quantity for manual stock item ${stockUsage.stockItemId}`);
                }
            }
        }
    }
    return {
        valid: missingItems.length === 0,
        missingItems
    };
}
