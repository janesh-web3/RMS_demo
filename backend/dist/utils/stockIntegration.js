"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateStockRequirements = calculateStockRequirements;
exports.checkOrderStockAvailability = checkOrderStockAvailability;
exports.deductStockForOrder = deductStockForOrder;
exports.validateStockForNewOrder = validateStockForNewOrder;
const MenuItem_1 = __importDefault(require("../models/MenuItem"));
const stockService_1 = require("../services/stockService");
/**
 * Calculate stock requirements for order items
 */
async function calculateStockRequirements(orderItems) {
    const stockRequirements = [];
    for (const orderItem of orderItems) {
        const menuItem = await MenuItem_1.default.findById(orderItem.itemId).populate('recipe.stockItemId');
        if (!menuItem || !menuItem.trackStock || !menuItem.recipe || menuItem.recipe.length === 0) {
            continue; // Skip items without stock tracking or recipe
        }
        // For each ingredient in the recipe
        for (const recipeItem of menuItem.recipe) {
            const requiredQuantity = recipeItem.quantity * orderItem.quantity;
            // Find if this stock item is already in requirements
            const existingReq = stockRequirements.find((req) => req.stockItemId === recipeItem.stockItemId.toString());
            if (existingReq) {
                existingReq.quantity += requiredQuantity;
            }
            else {
                stockRequirements.push({
                    stockItemId: recipeItem.stockItemId.toString(),
                    quantity: requiredQuantity,
                    itemName: menuItem.name
                });
            }
        }
    }
    return stockRequirements;
}
/**
 * Check if sufficient stock is available for an order
 */
async function checkOrderStockAvailability(orderItems) {
    const stockRequirements = await calculateStockRequirements(orderItems);
    if (stockRequirements.length === 0) {
        return { available: true, requirements: [], insufficientItems: [] };
    }
    const availability = await stockService_1.stockService.checkStockAvailability(stockRequirements.map((req) => ({
        stockItemId: req.stockItemId,
        quantity: req.quantity
    })));
    const insufficientItems = availability.filter((item) => !item.available);
    return {
        available: insufficientItems.length === 0,
        requirements: availability,
        insufficientItems
    };
}
/**
 * Deduct stock for an order when it's marked as served
 */
async function deductStockForOrder(orderId, orderItems, userId) {
    const stockRequirements = await calculateStockRequirements(orderItems);
    if (stockRequirements.length === 0) {
        return { deducted: false, message: 'No stock tracking required for this order' };
    }
    // Check availability first
    const { available, insufficientItems } = await checkOrderStockAvailability(orderItems);
    if (!available) {
        throw new Error(`Insufficient stock: ${insufficientItems
            .map((item) => `${item.itemName} (need ${item.requiredQuantity}, have ${item.currentQuantity})`)
            .join(', ')}`);
    }
    // Batch deduct stock
    await stockService_1.stockService.batchDeductStock(stockRequirements.map((req) => ({
        stockItemId: req.stockItemId,
        quantity: req.quantity
    })), userId, orderId, 'order_deduction');
    return {
        deducted: true,
        message: `Stock deducted for ${stockRequirements.length} ingredient(s)`,
        deductedItems: stockRequirements
    };
}
/**
 * Validate stock availability before creating an order
 */
async function validateStockForNewOrder(orderItems) {
    const { available, insufficientItems } = await checkOrderStockAvailability(orderItems);
    if (!available) {
        const errorDetails = insufficientItems
            .map((item) => `${item.itemName}: need ${item.requiredQuantity}, available ${item.currentQuantity}`)
            .join('; ');
        return {
            valid: false,
            error: `Insufficient stock for order: ${errorDetails}`
        };
    }
    return { valid: true, error: null };
}
