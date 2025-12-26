"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deductDirectManualStock = deductDirectManualStock;
exports.reverseDirectManualStockDeduction = reverseDirectManualStockDeduction;
const mongoose_1 = __importDefault(require("mongoose"));
const StockItem_1 = __importDefault(require("../models/StockItem"));
const StockTransaction_1 = __importDefault(require("../models/StockTransaction"));
/**
 * Convert quantity from one unit to another
 * Handles kg <-> g and liter <-> ml conversions
 */
function convertUnit(quantity, fromUnit, toUnit) {
    // If units are the same, no conversion needed
    if (fromUnit === toUnit) {
        return quantity;
    }
    // Weight conversions
    if ((fromUnit === 'kg' || fromUnit === 'g') && (toUnit === 'kg' || toUnit === 'g')) {
        if (fromUnit === 'kg' && toUnit === 'g') {
            return quantity * 1000;
        }
        else if (fromUnit === 'g' && toUnit === 'kg') {
            return quantity / 1000;
        }
    }
    // Volume conversions
    if ((fromUnit === 'liter' || fromUnit === 'ml') && (toUnit === 'liter' || toUnit === 'ml')) {
        if (fromUnit === 'liter' && toUnit === 'ml') {
            return quantity * 1000;
        }
        else if (fromUnit === 'ml' && toUnit === 'liter') {
            return quantity / 1000;
        }
    }
    // If no conversion rule applies, return as-is
    console.warn(`⚠️ No conversion rule for ${fromUnit} to ${toUnit}, using quantity as-is`);
    return quantity;
}
/**
 * Deduct manual stock items directly from billing entries (entered at reception)
 * This is called when creating a bill with manual stock entries
 */
async function deductDirectManualStock(manualStockEntries, billId, userId) {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const deductions = [];
        const errors = [];
        let totalCOGS = 0;
        // Process each manual stock entry
        for (const entry of manualStockEntries) {
            // Skip invalid entries
            if (!entry.stockItemId || !entry.quantityUsed || entry.quantityUsed <= 0) {
                continue;
            }
            const stockItem = await StockItem_1.default.findById(entry.stockItemId).session(session);
            if (!stockItem) {
                errors.push(`Stock item ${entry.stockItemName || entry.stockItemId} not found`);
                continue;
            }
            // Convert the entered quantity to the stock item's unit
            const convertedQuantity = convertUnit(entry.quantityUsed, entry.unit, stockItem.unit);
            console.log(`📊 Converting ${entry.quantityUsed} ${entry.unit} to ${convertedQuantity} ${stockItem.unit}`);
            // Check if sufficient stock is available
            if (stockItem.quantity < convertedQuantity) {
                errors.push(`Insufficient stock for ${stockItem.name}. Required: ${convertedQuantity.toFixed(3)} ${stockItem.unit}, Available: ${stockItem.quantity} ${stockItem.unit}`);
                continue;
            }
            // Deduct stock
            const previousQuantity = stockItem.quantity;
            stockItem.quantity -= convertedQuantity;
            await stockItem.save({ session });
            // Calculate COGS (using the converted quantity and stock's cost per unit)
            const cogs = convertedQuantity * stockItem.costPerUnit;
            totalCOGS += cogs;
            // Create transaction record
            await StockTransaction_1.default.create([
                {
                    stockItemId: stockItem._id,
                    type: 'outflow',
                    quantity: -convertedQuantity, // Negative for outflow
                    reason: 'order_deduction',
                    notes: `Manual deduction at billing (entered by reception) for bill ${billId}. Converted from ${entry.quantityUsed} ${entry.unit} to ${convertedQuantity.toFixed(3)} ${stockItem.unit}`,
                    userId,
                    costPerUnit: stockItem.costPerUnit,
                    totalCost: cogs,
                    balanceAfter: stockItem.quantity,
                    date: new Date()
                }
            ], { session });
            deductions.push({
                stockItemId: stockItem._id,
                stockName: stockItem.name,
                quantityDeducted: convertedQuantity,
                unit: stockItem.unit,
                costOfGoodsSold: cogs
            });
            console.log(`✅ [Direct Manual Deduction] Deducted ${convertedQuantity.toFixed(3)} ${stockItem.unit} of ${stockItem.name}. Previous: ${previousQuantity}, New: ${stockItem.quantity}`);
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
                ? `Successfully deducted ${deductions.length} manual stock item(s) at billing`
                : 'No manual stock items to deduct',
            deductions,
            totalCOGS
        };
    }
    catch (error) {
        await session.abortTransaction();
        console.error('❌ Error deducting direct manual stock at billing:', error);
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
 * Reverse direct manual stock deduction (for bill cancellation/refund)
 */
async function reverseDirectManualStockDeduction(billId, userId) {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        // Find all manual deduction transactions for this bill
        const transactions = await StockTransaction_1.default.find({
            type: 'outflow',
            reason: 'order_deduction',
            notes: { $regex: `bill ${billId}` }
        }).session(session);
        if (transactions.length === 0) {
            await session.abortTransaction();
            return {
                success: false,
                message: 'No manual stock transactions found for this bill'
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
                    notes: `Reversed manual deduction for bill ${billId}`,
                    userId,
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
            console.log(`♻️ [Reversal] Restored ${quantityToReverse} ${stockItem.unit} of ${stockItem.name}. New balance: ${stockItem.quantity}`);
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
        console.error('Error reversing direct manual stock deduction:', error);
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
