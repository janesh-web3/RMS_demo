"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printBillReceipt = exports.printKitchen = void 0;
const printer_1 = require("../utils/printer");
const socket_1 = require("../utils/socket");
const Order_1 = __importDefault(require("../models/Order"));
const Bill_1 = __importDefault(require("../models/Bill"));
const RestaurantSettings_1 = __importDefault(require("../models/RestaurantSettings"));
const printKitchen = async (req, res) => {
    try {
        const { orderId } = req.body;
        if (!orderId) {
            return res.status(400).json({ message: 'Order ID is required' });
        }
        const order = await Order_1.default.findById(orderId)
            .populate('tableId')
            .populate('items.itemId');
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        // Filter items that need to be sent to kitchen (printToKitchen === true)
        const kitchenItems = order.items.filter(item => {
            const menuItem = item.itemId;
            return menuItem.printToKitchen === true;
        });
        // If no items need to go to kitchen, don't print
        if (kitchenItems.length === 0) {
            return res.json({ message: 'No items to print to kitchen - all items are prepared at reception' });
        }
        // Get restaurant settings for frontend printing
        const restaurantSettings = await RestaurantSettings_1.default.findOne();
        const orderData = {
            orderId: order._id,
            orderNumber: order.orderNumber,
            tableNumber: order.tableId.tableNumber,
            items: kitchenItems.map(item => ({
                quantity: item.quantity,
                name: item.itemId.name,
                selectedVariation: item.selectedVariation,
                addOns: item.addOns,
                notes: item.notes
            })),
            restaurantSettings: restaurantSettings ? {
                restaurantName: restaurantSettings.restaurantName,
                address: restaurantSettings.address,
                phone: restaurantSettings.phone
            } : null
        };
        // Emit real-time print notification to cashier/admin (not the requesting user)
        // Using the new dedicated socket events for auto-printing
        (0, socket_1.emitNewOrder)(orderData);
        // Attempt server-side printing first
        try {
            const printSuccess = await (0, printer_1.printKitchenOrder)(orderData);
            if (printSuccess) {
                // Mark order as printed
                await Order_1.default.findByIdAndUpdate(orderId, {
                    isPrinted: true,
                    printedAt: new Date()
                });
                res.json({
                    message: 'Kitchen order print notification sent to reception',
                    printData: orderData,
                    success: true,
                    printed: true
                });
            }
            else {
                // Even if server printing fails, we still sent the notification
                res.json({
                    message: 'Kitchen order print notification sent to reception',
                    printData: orderData,
                    success: true,
                    printed: false
                });
            }
        }
        catch (printError) {
            console.warn('Server-side printing failed:', printError);
            // The notification was still sent
            res.json({
                message: 'Kitchen order print notification sent to reception',
                printData: orderData,
                success: true,
                printed: false
            });
        }
    }
    catch (error) {
        console.error('Print kitchen error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.printKitchen = printKitchen;
const printBillReceipt = async (req, res) => {
    try {
        const { billId } = req.body;
        if (!billId) {
            return res.status(400).json({ message: 'Bill ID is required' });
        }
        const bill = await Bill_1.default.findById(billId)
            .populate('tableId')
            .populate({
            path: 'orders',
            populate: {
                path: 'items.itemId'
            }
        });
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        // Get restaurant settings for frontend printing
        const restaurantSettings = await RestaurantSettings_1.default.findOne();
        const billData = {
            billId: bill._id,
            billNumber: bill.billNumber,
            tableNumber: bill.tableId.tableNumber,
            createdAt: bill.createdAt,
            orders: bill.orders.map((order) => ({
                ...order.toObject(),
                items: order.items.map((item) => ({
                    itemId: item.itemId,
                    name: item.itemId?.name || 'Unknown Item',
                    quantity: item.quantity,
                    itemPrice: item.itemPrice,
                    price: item.itemPrice, // Alias for compatibility
                    addOnPrice: item.addOnPrice || 0,
                    totalPrice: item.totalPrice,
                    selectedVariation: item.selectedVariation,
                    addOns: item.addOns || [],
                    notes: item.notes,
                    status: item.status
                }))
            })),
            subtotal: bill.subtotal,
            tax: bill.tax,
            discount: bill.discount,
            total: bill.total,
            paymentMethods: bill.paymentMethods,
            restaurantSettings: restaurantSettings ? {
                restaurantName: restaurantSettings.restaurantName,
                address: restaurantSettings.address,
                phone: restaurantSettings.phone,
                taxRate: restaurantSettings.taxRate
            } : null
        };
        // Emit real-time print notification to cashier/admin
        // Using the new dedicated socket events for auto-printing
        (0, socket_1.emitNewBill)(billData);
        // Attempt server-side printing first
        try {
            const printSuccess = await (0, printer_1.printBill)(billData);
            if (printSuccess) {
                // Mark bill as printed
                await Bill_1.default.findByIdAndUpdate(billId, {
                    isPrinted: true,
                    printedAt: new Date()
                });
                res.json({
                    message: 'Bill print notification sent to reception',
                    printData: billData,
                    success: true,
                    printed: true
                });
            }
            else {
                // Even if server printing fails, we still sent the notification
                res.json({
                    message: 'Bill print notification sent to reception',
                    printData: billData,
                    success: true,
                    printed: false
                });
            }
        }
        catch (printError) {
            console.warn('Server-side printing failed:', printError);
            // The notification was still sent
            res.json({
                message: 'Bill print notification sent to reception',
                printData: billData,
                success: true,
                printed: false
            });
        }
    }
    catch (error) {
        console.error('Print bill error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.printBillReceipt = printBillReceipt;
