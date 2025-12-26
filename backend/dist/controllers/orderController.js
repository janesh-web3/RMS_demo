"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getManualStockItemsForMenuItem = exports.updateStockUsage = exports.cancelOrder = exports.cancelOrderItem = exports.mergeOrders = exports.changeOrderTable = exports.removeOrderItem = exports.updateOrderItem = exports.addItemsToOrder = exports.getActiveOrderForTable = exports.printKOTForAddedItems = exports.printOrderById = exports.getOrdersBySession = exports.updateOrderStatus = exports.getOrderById = exports.getAllOrders = exports.getOrdersByTable = exports.createOrder = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const Table_1 = __importDefault(require("../models/Table"));
const MenuItem_1 = __importDefault(require("../models/MenuItem"));
const RestaurantSettings_1 = __importDefault(require("../models/RestaurantSettings"));
const socket_1 = require("../utils/socket");
const notificationService_1 = require("../services/notificationService");
const printer_1 = require("../utils/printer");
const printServerService_1 = require("../services/printServerService");
const mongoose_1 = __importDefault(require("mongoose"));
const stockDeductionService_1 = require("../services/stockDeductionService");
const autoStockDeductionService_1 = require("../services/autoStockDeductionService");
const generateOrderNumber = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
    return `ORD-${timestamp.slice(-6)}${random}`;
};
const createOrder = async (req, res) => {
    try {
        const { tableId, items, sessionId } = req.body;
        const waiterId = req.user?.id;
        if (!tableId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "Table ID and items are required",
            });
        }
        const table = await Table_1.default.findById(tableId);
        if (!table) {
            return res.status(404).json({ message: "Table not found" });
        }
        let processedItems = [];
        for (const item of items) {
            const menuItem = await MenuItem_1.default.findById(item.itemId);
            if (!menuItem) {
                return res.status(404).json({
                    message: `Menu item ${item.itemId} not found`,
                });
            }
            let itemPrice = menuItem.price;
            if (item.selectedVariation) {
                const variation = menuItem.variations?.find((v) => v.name === item.selectedVariation);
                if (variation) {
                    itemPrice = variation.price;
                }
            }
            let addOnTotal = 0;
            if (item.addOns && Array.isArray(item.addOns)) {
                for (const addOnName of item.addOns) {
                    const addOn = menuItem.addOns?.find((ao) => ao.name === addOnName);
                    if (addOn) {
                        addOnTotal += addOn.price;
                    }
                }
            }
            const totalPrice = (itemPrice + addOnTotal) * item.quantity;
            processedItems.push({
                itemId: item.itemId,
                quantity: item.quantity,
                notes: item.notes || "",
                selectedVariation: item.selectedVariation,
                addOns: item.addOns || [],
                itemPrice: itemPrice,
                addOnPrice: addOnTotal,
                totalPrice,
                status: 'active',
            });
        }
        const totalAmount = processedItems.reduce((sum, item) => sum + item.totalPrice, 0);
        // Check automatic stock availability before creating order
        // (drinks, cigarettes, etc. with deductionType='automatic')
        const autoStockCheck = await (0, autoStockDeductionService_1.checkAutoStockAvailability)(processedItems);
        if (!autoStockCheck.success) {
            return res.status(400).json({
                message: autoStockCheck.message,
                insufficientItems: autoStockCheck.insufficientItems,
                error: 'INSUFFICIENT_STOCK'
            });
        }
        const order = new Order_1.default({
            tableId,
            items: processedItems,
            status: "Pending",
            orderNumber: generateOrderNumber(),
            waiterId,
            sessionId: sessionId || new mongoose_1.default.Types.ObjectId().toString(),
            totalAmount,
        });
        await order.save();
        await order.populate("tableId items.itemId waiterId");
        // Deduct automatic stock items immediately (drinks, cigarettes, etc.)
        // Manual items (meats) will be deducted at billing time
        const userId = req.user?.id;
        if (userId) {
            try {
                const autoDeductionResult = await (0, autoStockDeductionService_1.deductAutoStockOnOrderCreation)(order.items, order._id, new mongoose_1.default.Types.ObjectId(userId));
                if (autoDeductionResult.success) {
                    console.log(`✅ Automatic stock deducted for order ${order.orderNumber}:`, autoDeductionResult.deductions);
                }
                else {
                    console.warn(`⚠️ Automatic stock deduction warning for order ${order.orderNumber}:`, autoDeductionResult.message);
                    // Continue with order creation even if auto deduction has issues
                }
            }
            catch (autoStockError) {
                console.error('Error deducting automatic stock:', autoStockError);
                // Don't fail order creation if automatic stock deduction fails
            }
        }
        await Table_1.default.findByIdAndUpdate(tableId, { status: "Occupied" });
        // Send notifications
        try {
            await notificationService_1.notificationService.notifyOrderCreated({
                ...order.toObject(),
                tableNumber: table.tableNumber
            });
            await notificationService_1.notificationService.notifyTableStatusUpdated({
                tableId,
                tableNumber: table.tableNumber,
                status: "Occupied"
            });
        }
        catch (notificationError) {
            console.error("Notification error:", notificationError);
            // Don't fail the order creation if notifications fail
        }
        // Emit real-time events
        const io = (0, socket_1.getIO)();
        console.log('Emitting order events for:', order.orderNumber);
        // Enhanced order data with table information
        const orderObj = order.toObject();
        const enrichedOrderData = {
            ...orderObj,
            tableNumber: table.tableNumber,
            items: orderObj.items || [] // Ensure items is always an array
        };
        console.log('📦 Order items count:', enrichedOrderData.items?.length || 0);
        // Role-based notifications
        console.log('🚀 Emitting orderCreated event for order:', order.orderNumber);
        (0, socket_1.emitOrderNotification)('orderCreated', enrichedOrderData);
        console.log('✅ orderCreated event emitted');
        // Comprehensive order creation events
        io.emit("order-created", {
            ...enrichedOrderData,
            timestamp: new Date().toISOString()
        });
        io.emit("order-updated", {
            type: "created",
            order: enrichedOrderData,
            orderId: order._id,
            tableId,
            tableNumber: table.tableNumber,
            timestamp: new Date().toISOString()
        });
        // Enhanced table status update
        const tableUpdateData = {
            tableId,
            tableNumber: table.tableNumber,
            status: "Occupied",
            previousStatus: table.status,
            table: table.toObject(),
            orderId: order._id,
            orderNumber: order.orderNumber,
            timestamp: new Date().toISOString()
        };
        (0, socket_1.emitTableNotification)('tableStatusUpdated', tableUpdateData);
        io.emit("table-updated", tableUpdateData);
        io.emit("table-status-changed", tableUpdateData);
        // Legacy events for backward compatibility
        // NOTE: orderCreated is already emitted via emitOrderNotification above (line 144)
        // Removing duplicate emission to prevent orders appearing twice
        io.emit("tableStatusUpdate", { tableId, status: "Occupied" });
        // Note: Auto-printing is now handled by backend print server
        // QZ Tray integration has been removed - no need to emit newOrder event
        // Auto-print kitchen order (only items that need kitchen preparation)
        try {
            // Filter items that need to be sent to kitchen (printToKitchen === true)
            const kitchenItems = order.items.filter(item => {
                const menuItem = item.itemId;
                return menuItem.printToKitchen === true;
            });
            console.log(`\n==================== PRINT DEBUG START ====================`);
            console.log(`📋 Order: ${order.orderNumber}, Total Items: ${order.items.length}`);
            console.log(`🍳 Kitchen Items (printToKitchen=true): ${kitchenItems.length}`);
            if (kitchenItems.length === 0) {
                console.log(`⚠️  All items have printToKitchen=false:`);
                order.items.forEach((item, idx) => {
                    const menuItem = item.itemId;
                    console.log(`   ${idx + 1}. ${menuItem.name} - printToKitchen: ${menuItem.printToKitchen}`);
                });
            }
            if (kitchenItems.length > 0) {
                console.log(`🖨️  Processing print for order ${order.orderNumber} with ${kitchenItems.length} kitchen items`);
                // Check if print server is enabled
                const usePrintServer = await (0, printServerService_1.isPrintServerEnabled)();
                console.log(`🔧 Print Server Enabled: ${usePrintServer}`);
                if (usePrintServer) {
                    // Use print server API
                    console.log(`🌐 Using print server for order ${order.orderNumber}`);
                    const printData = {
                        orderId: order.orderNumber,
                        tableNo: table.tableNumber,
                        orderType: 'Dine-In',
                        items: kitchenItems.map(item => ({
                            name: item.itemId.name,
                            quantity: item.quantity,
                            variations: item.selectedVariation ? [{
                                    name: 'Variation',
                                    option: item.selectedVariation
                                }] : [],
                            addOns: item.addOns?.map(addon => ({
                                name: addon
                            })) || [],
                            notes: item.notes
                        }))
                    };
                    console.log(`📤 Sending print request to server...`);
                    const printResult = await (0, printServerService_1.printKitchenOrderViaServer)(printData);
                    if (printResult.success) {
                        console.log(`✅ Kitchen order ${order.orderNumber} printed via server. Job ID: ${printResult.jobId}`);
                    }
                    else {
                        console.error(`❌ Print server failed for order ${order.orderNumber}: ${printResult.error}`);
                        console.log(`📋 Falling back to local printer...`);
                        // Fallback to local printing
                        const orderData = {
                            orderNumber: order.orderNumber,
                            tableNumber: table.tableNumber,
                            items: kitchenItems.map(item => ({
                                quantity: item.quantity,
                                name: item.itemId.name,
                                selectedVariation: item.selectedVariation,
                                addOns: item.addOns,
                                notes: item.notes
                            }))
                        };
                        await (0, printer_1.printKitchenOrder)(orderData);
                        console.log(`✅ Kitchen order ${order.orderNumber} printed via local fallback`);
                    }
                }
                else {
                    // Use local printing directly
                    console.log(`🖨️  Using local printer for order ${order.orderNumber}`);
                    const orderData = {
                        orderNumber: order.orderNumber,
                        tableNumber: table.tableNumber,
                        items: kitchenItems.map(item => ({
                            quantity: item.quantity,
                            name: item.itemId.name,
                            selectedVariation: item.selectedVariation,
                            addOns: item.addOns,
                            notes: item.notes
                        }))
                    };
                    await (0, printer_1.printKitchenOrder)(orderData);
                    console.log(`✅ Kitchen order ${order.orderNumber} printed locally`);
                }
            }
            else {
                console.log(`ℹ️  No kitchen items to print for order ${order.orderNumber} - all items are reception-only`);
            }
            console.log(`==================== PRINT DEBUG END ====================\n`);
        }
        catch (error) {
            console.error(`❌ PRINT ERROR for order ${order.orderNumber}:`, error);
            console.error(`Error details:`, {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                code: error.code
            });
            console.log(`==================== PRINT DEBUG END (ERROR) ====================\n`);
            // Don't fail the order creation if printing fails
        }
        io.emit("tableStatusUpdated", tableUpdateData);
        io.emit("orderUpdate", { type: "created", order });
        io.emit("refreshOrders");
        io.emit("refreshTables");
        res.status(201).json(order);
    }
    catch (error) {
        console.error("Create order error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.createOrder = createOrder;
const getOrdersByTable = async (req, res) => {
    try {
        const { tableId } = req.params;
        const { status } = req.query;
        let filter = { tableId };
        if (status)
            filter.status = status;
        const orders = await Order_1.default.find(filter)
            .populate("tableId")
            .populate("items.itemId")
            .sort({ createdAt: -1 });
        res.json(orders);
    }
    catch (error) {
        console.error("Get orders by table error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getOrdersByTable = getOrdersByTable;
const getAllOrders = async (req, res) => {
    try {
        const { status, limit, page, search, waiterId, tableId, dateRange, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        // Build filter object
        let filter = {};
        if (status)
            filter.status = status;
        if (waiterId)
            filter.waiterId = waiterId;
        if (tableId)
            filter.tableId = tableId;
        // Search filter
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            filter.$or = [
                { orderNumber: { $regex: searchRegex } }
            ];
        }
        // Date range filter
        if (dateRange) {
            const now = new Date();
            let startDate;
            switch (dateRange) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    filter.createdAt = { $gte: startDate };
                    break;
                case 'yesterday':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    filter.createdAt = { $gte: startDate, $lt: endDate };
                    break;
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    filter.createdAt = { $gte: startDate };
                    break;
                case 'month':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    filter.createdAt = { $gte: startDate };
                    break;
            }
        }
        // Pagination setup
        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 20;
        const skip = (pageNumber - 1) * limitNumber;
        // Sort setup
        const sortObject = {};
        sortObject[sortBy] = sortOrder === 'asc' ? 1 : -1;
        // Get total count for pagination
        const totalOrders = await Order_1.default.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / limitNumber);
        // Get orders with pagination
        const orders = await Order_1.default.find(filter)
            .populate("tableId")
            .populate("items.itemId")
            .populate("waiterId", "name")
            .sort(sortObject)
            .skip(skip)
            .limit(limitNumber);
        // Return paginated response
        res.json({
            orders,
            pagination: {
                currentPage: pageNumber,
                totalPages,
                totalOrders,
                limit: limitNumber,
                hasNext: pageNumber < totalPages,
                hasPrev: pageNumber > 1
            }
        });
    }
    catch (error) {
        console.error("Get all orders error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getAllOrders = getAllOrders;
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order_1.default.findById(id)
            .populate("tableId")
            .populate("items.itemId")
            .populate("waiterId", "name");
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        res.json(order);
    }
    catch (error) {
        console.error("Get order by ID error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getOrderById = getOrderById;
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }
        // Get current order to check current status
        const currentOrder = await Order_1.default.findById(id);
        if (!currentOrder) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Prevent status regression - can't go backwards in the workflow
        const statusOrder = ["Pending", "Cooking", "Ready", "Served"];
        const currentStatusIndex = statusOrder.indexOf(currentOrder.status);
        const newStatusIndex = statusOrder.indexOf(status);
        // Allow only forward progression - no backward status changes allowed for anyone
        if (newStatusIndex < currentStatusIndex) {
            return res.status(400).json({
                message: `Cannot change status from ${currentOrder.status} to ${status}. Status can only progress forward.`,
            });
        }
        // Prevent status change if order is already billed
        if (currentOrder.isBilled) {
            return res.status(400).json({
                message: "Cannot change status of billed orders",
            });
        }
        const order = await Order_1.default.findByIdAndUpdate(id, { status }, { new: true }).populate("tableId items.itemId");
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Deduct stock when order moves to "Cooking" status (order confirmed)
        if (status === "Cooking" && currentOrder.status === "Pending") {
            const userId = req.user?.id ? new mongoose_1.default.Types.ObjectId(req.user.id) : order.waiterId;
            const stockDeduction = await (0, stockDeductionService_1.deductStockForOrder)(order.items, order._id, userId);
            if (!stockDeduction.success) {
                // Revert status change if stock deduction fails
                await Order_1.default.findByIdAndUpdate(id, { status: currentOrder.status });
                return res.status(400).json({
                    message: stockDeduction.message,
                    insufficientItems: stockDeduction.insufficientItems,
                    error: 'STOCK_DEDUCTION_FAILED'
                });
            }
            // Emit stock update event
            const io = (0, socket_1.getIO)();
            io.emit("stock-updated", {
                orderId: order._id,
                orderNumber: order.orderNumber,
                deductions: stockDeduction.deductions,
                totalCOGS: stockDeduction.totalCOGS,
                timestamp: new Date().toISOString()
            });
            console.log(`Stock deducted for order ${order.orderNumber}. Total COGS: ₹${stockDeduction.totalCOGS?.toFixed(2)}`);
        }
        // Send order status notification
        try {
            await notificationService_1.notificationService.notifyOrderStatusUpdated({
                ...order.toObject(),
                tableNumber: order.tableId?.tableNumber || order.tableId?.number || 'N/A'
            });
        }
        catch (notificationError) {
            console.error("Notification error:", notificationError);
        }
        // Emit real-time events
        const io = (0, socket_1.getIO)();
        console.log('Emitting order status update for:', order.orderNumber, 'to status:', status);
        // Get table information for comprehensive updates
        const tableInfo = await Table_1.default.findById(order.tableId);
        const enrichedOrderData = {
            ...order.toObject(),
            tableNumber: tableInfo?.tableNumber
        };
        // Role-based notifications
        (0, socket_1.emitOrderNotification)('orderStatusUpdated', enrichedOrderData);
        // Comprehensive standardized events for all dashboards
        io.emit("order-status-changed", {
            orderId: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            tableId: order.tableId,
            tableNumber: tableInfo?.tableNumber,
            order: enrichedOrderData,
            timestamp: new Date().toISOString()
        });
        io.emit("order-updated", {
            type: "statusUpdated",
            order: enrichedOrderData,
            orderId: order._id,
            tableId: order.tableId,
            tableNumber: tableInfo?.tableNumber,
            previousStatus: currentOrder.status,
            newStatus: status,
            timestamp: new Date().toISOString()
        });
        // Legacy events for backward compatibility
        io.emit("orderStatusUpdate", order);
        io.emit("orderUpdate", { type: "statusUpdated", order });
        io.emit("orderStatusUpdated", enrichedOrderData);
        io.emit("refreshOrders");
        // NEW: Simplified socket emission for our rewritten frontend
        const simpleSocketData = {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            status: order.status,
            tableNumber: tableInfo?.tableNumber || 'Unknown',
            updatedAt: order.updatedAt,
            order: enrichedOrderData
        };
        (0, socket_1.emitOrderStatusChange)(simpleSocketData);
        if (status === "Served") {
            const tableOrders = await Order_1.default.find({
                tableId: order.tableId,
                status: { $ne: "Served" },
            });
            if (tableOrders.length === 0) {
                await Table_1.default.findByIdAndUpdate(order.tableId, {
                    status: "Waiting for Bill",
                });
                // Send table status notification
                try {
                    await notificationService_1.notificationService.notifyTableStatusUpdated({
                        tableId: order.tableId,
                        tableNumber: order.tableId.tableNumber,
                        status: "Waiting for Bill"
                    });
                }
                catch (notificationError) {
                    console.error("Notification error:", notificationError);
                }
                // Emit comprehensive table status update
                const updatedTable = await Table_1.default.findById(order.tableId);
                const tableUpdateData = {
                    tableId: order.tableId,
                    tableNumber: tableInfo?.tableNumber,
                    status: "Waiting for Bill",
                    previousStatus: tableInfo?.status,
                    table: updatedTable?.toObject(),
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    timestamp: new Date().toISOString()
                };
                // Role-based table notifications
                (0, socket_1.emitTableNotification)('tableStatusUpdated', tableUpdateData);
                // Standardized table events
                io.emit("table-updated", tableUpdateData);
                io.emit("table-status-changed", tableUpdateData);
                // Legacy events for backward compatibility
                io.emit("tableStatusUpdate", {
                    tableId: order.tableId,
                    status: "Waiting for Bill",
                });
                io.emit("tableStatusUpdated", tableUpdateData);
                io.emit("refreshTables");
            }
        }
        res.json(order);
    }
    catch (error) {
        console.error("Update order status error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.updateOrderStatus = updateOrderStatus;
const getOrdersBySession = async (req, res) => {
    try {
        const { tableId, sessionId } = req.params;
        const orders = await Order_1.default.find({ tableId, sessionId })
            .populate("tableId")
            .populate("items.itemId")
            .populate("waiterId", "name")
            .sort({ createdAt: -1 });
        res.json(orders);
    }
    catch (error) {
        console.error("Get orders by session error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getOrdersBySession = getOrdersBySession;
const printOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🖨️ Print request for order: ${id}`);
        const order = await Order_1.default.findById(id)
            .populate("tableId")
            .populate("items.itemId")
            .populate("waiterId", "name");
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Filter items that need to be sent to kitchen (printToKitchen === true)
        const kitchenItems = order.items.filter((item) => {
            const menuItem = item.itemId;
            return menuItem?.printToKitchen === true;
        });
        if (kitchenItems.length === 0) {
            return res.json({
                message: 'No kitchen items to print - all items are prepared at reception',
                success: true,
                printData: null
            });
        }
        // Get restaurant settings for frontend printing
        const restaurantSettings = await RestaurantSettings_1.default.findOne();
        const orderData = {
            orderNumber: order.orderNumber,
            tableNumber: order.tableId?.tableNumber || order.tableId?.number || 'N/A',
            items: kitchenItems.map((item) => ({
                quantity: item.quantity,
                name: item.itemId?.name || 'Unknown Item',
                selectedVariation: item.selectedVariation,
                addOns: item.addOns || [],
                notes: item.notes || ''
            })),
            restaurantSettings: restaurantSettings ? {
                restaurantName: restaurantSettings.restaurantName,
                address: restaurantSettings.address,
                phone: restaurantSettings.phone
            } : null
        };
        // Increment print count and update order
        console.log(`📊 Incrementing print count for order: ${id}`);
        const updatedOrder = await Order_1.default.findByIdAndUpdate(id, {
            $inc: { printCount: 1 },
            isPrinted: true,
            printedAt: new Date()
        }, { new: true });
        console.log(`✅ Order updated - New print count: ${updatedOrder?.printCount}`);
        // Emit real-time update for print count
        const io = (0, socket_1.getIO)();
        if (io) {
            io.emit('orderPrintUpdated', {
                orderId: id,
                printCount: updatedOrder?.printCount || 1
            });
        }
        // Return data for client-side printing instead of server-side printing
        res.json({
            message: "Order data ready for printing",
            printData: orderData,
            printCount: updatedOrder?.printCount || 1,
            success: true
        });
    }
    catch (error) {
        console.error("Print order by ID error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.printOrderById = printOrderById;
/**
 * Manual KOT print endpoint for newly added items
 * Used when user confirms they want to print KOT after adding items
 */
const printKOTForAddedItems = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { itemIndices } = req.body; // Optional: specific item indices to print
        console.log(`🖨️  Manual KOT print request for order: ${orderId}`);
        const order = await Order_1.default.findById(orderId)
            .populate("tableId")
            .populate("items.itemId")
            .populate("waiterId", "name");
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Get items to print (either specific indices or all unprinted kitchen items)
        let itemsToPrint = order.items;
        if (itemIndices && Array.isArray(itemIndices)) {
            // Print specific items by index
            itemsToPrint = itemIndices.map(idx => order.items[idx]).filter(Boolean);
        }
        else {
            // Print all items that haven't been KOT printed yet
            itemsToPrint = order.items.filter((item) => !item.kotPrinted);
        }
        // Filter only kitchen items
        const kitchenItems = itemsToPrint.filter((item) => {
            const menuItem = item.itemId;
            return menuItem?.printToKitchen === true;
        });
        if (kitchenItems.length === 0) {
            return res.json({
                message: 'No new kitchen items to print',
                success: true,
                kotPrinted: false
            });
        }
        // Get restaurant settings
        const restaurantSettings = await RestaurantSettings_1.default.findOne();
        const kotData = {
            orderNumber: order.orderNumber,
            tableNumber: order.tableId?.tableNumber || order.tableId?.number || 'N/A',
            items: kitchenItems.map((item) => ({
                quantity: item.quantity,
                name: item.itemId?.name || 'Unknown Item',
                selectedVariation: item.selectedVariation,
                addOns: item.addOns || [],
                notes: item.notes || ''
            })),
            restaurantSettings: restaurantSettings ? {
                restaurantName: restaurantSettings.restaurantName,
                address: restaurantSettings.address,
                phone: restaurantSettings.phone
            } : null
        };
        // Print KOT
        await (0, printer_1.printKOTForNewItems)(kotData, true);
        // Mark items as KOT printed
        for (let i = 0; i < order.items.length; i++) {
            const item = order.items[i];
            const wasInPrintList = kitchenItems.some((printItem) => {
                // Compare by matching all properties since items don't have _id in subdocuments
                const menuItemId1 = printItem.itemId?._id || printItem.itemId;
                const menuItemId2 = item.itemId?._id || item.itemId;
                return menuItemId1?.toString() === menuItemId2?.toString() &&
                    printItem.selectedVariation === item.selectedVariation &&
                    JSON.stringify(printItem.addOns || []) === JSON.stringify(item.addOns || []);
            });
            if (wasInPrintList) {
                item.kotPrinted = true;
                item.kotPrintedAt = new Date();
                item.kotPrintCount = (item.kotPrintCount || 0) + 1;
            }
        }
        await order.save();
        // Emit real-time update
        const io = (0, socket_1.getIO)();
        if (io) {
            io.emit('kotPrinted', {
                orderId: orderId,
                itemCount: kitchenItems.length
            });
        }
        console.log(`✅ KOT printed successfully for ${kitchenItems.length} items on order: ${order.orderNumber}`);
        res.json({
            message: `KOT printed successfully for ${kitchenItems.length} items`,
            kotPrinted: true,
            itemCount: kitchenItems.length,
            success: true
        });
    }
    catch (error) {
        console.error("Print KOT for added items error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.printKOTForAddedItems = printKOTForAddedItems;
const printOrder = async (order) => {
    try {
        // Filter items that need to be sent to kitchen (printToKitchen === true)
        const kitchenItems = order.items.filter((item) => {
            const menuItem = item.itemId;
            return menuItem?.printToKitchen === true;
        });
        if (kitchenItems.length === 0) {
            console.log('No kitchen items to print for order:', order.orderNumber, '- All items are prepared at reception');
            return true; // Return success since there's nothing wrong, just nothing to print
        }
        const orderData = {
            orderNumber: order.orderNumber,
            tableNumber: order.tableId?.tableNumber || order.tableId?.number || 'N/A',
            items: kitchenItems.map((item) => ({
                quantity: item.quantity,
                name: item.itemId?.name || 'Unknown Item',
                selectedVariation: item.selectedVariation,
                addOns: item.addOns || [],
                notes: item.notes || ''
            }))
        };
        const success = await (0, printer_1.printKitchenOrder)(orderData);
        if (success) {
            console.log('Kitchen items printed successfully for order:', order.orderNumber, '- Kitchen items:', kitchenItems.length);
        }
        else {
            console.error('Failed to print kitchen items for order:', order.orderNumber);
        }
        return success;
    }
    catch (error) {
        console.error('Print order error:', error);
        return false;
    }
};
const generateKitchenOrderContent = (order) => {
    const now = new Date();
    // For 12cm paper, we can use more characters (approximately 42 characters width)
    let content = `
==========================================
         KITCHEN ORDER
==========================================
Table: ${order.tableId?.tableNumber || 'N/A'}
Order: ${order.orderNumber}
Time: ${now.toLocaleTimeString()}

ITEMS:
------------------------------------------`;
    // Filter items that need to be sent to kitchen
    const kitchenItems = order.items.filter((item) => {
        const menuItem = item.itemId;
        return menuItem.printToKitchen === true;
    });
    kitchenItems.forEach((item) => {
        const itemName = item.itemId?.name || 'Unknown Item';
        const qty = item.quantity;
        // For 12cm paper, use more characters
        const maxItemNameLength = 25; // Increased from default
        const truncatedItemName = itemName.length > maxItemNameLength
            ? itemName.substring(0, maxItemNameLength - 3) + "..."
            : itemName;
        content += `\n${qty}x ${truncatedItemName}`;
        if (item.selectedVariation) {
            content += `\n   → ${item.selectedVariation}`;
        }
        if (item.addOns && item.addOns.length > 0) {
            content += `\n   → + ${item.addOns.join(', ')}`;
        }
        if (item.notes) {
            content += `\n   → Notes: ${item.notes}`;
        }
        content += '\n';
    });
    content += `------------------------------------------
Time: ${now.toLocaleTimeString()}
==========================================
`;
    return content;
};
const generatePrintContent = (order) => {
    const now = new Date();
    const orderTime = new Date(order.createdAt);
    let content = `
RESTAURANT ORDER
================
Order #: ${order.orderNumber}
Table: ${order.tableId?.number || "N/A"}
Waiter: ${order.waiterId?.name || "N/A"}
Order Time: ${orderTime.toLocaleString()}
Print Time: ${now.toLocaleString()}

ITEMS:
------`;
    order.items.forEach((item, index) => {
        content += `
${index + 1}. ${item.itemId?.name || "Unknown Item"}`;
        if (item.selectedVariation) {
            content += ` (${item.selectedVariation})`;
        }
        content += `
   Qty: ${item.quantity}
   Price: रू ${item.totalPrice.toFixed(2)}`;
        if (item.addOns && item.addOns.length > 0) {
            content += `
   Add-ons: ${item.addOns.join(", ")}`;
        }
        if (item.notes) {
            content += `
   Notes: ${item.notes}`;
        }
        content += "\n";
    });
    content += `
------
TOTAL: रू ${order.totalAmount.toFixed(2)}
Status: ${order.status}
================
`;
    return content;
};
const getActiveOrderForTable = async (req, res) => {
    try {
        const { tableId } = req.params;
        // Find the most recent non-billed order for this table
        const activeOrder = await Order_1.default.findOne({
            tableId,
            isBilled: false,
            status: { $ne: 'Served' } // Not served yet, so items can still be added
        })
            .populate("tableId items.itemId waiterId")
            .sort({ createdAt: -1 });
        if (!activeOrder) {
            return res.status(404).json({ message: "No active order found for this table" });
        }
        res.json(activeOrder);
    }
    catch (error) {
        console.error("Get active order for table error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getActiveOrderForTable = getActiveOrderForTable;
const addItemsToOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { items, autoPrint = true } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "Items are required",
            });
        }
        const existingOrder = await Order_1.default.findById(orderId);
        if (!existingOrder) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Prevent adding items to billed orders
        if (existingOrder.isBilled) {
            return res.status(400).json({
                message: "Cannot add items to billed orders",
            });
        }
        // Get restaurant settings for KOT auto-print configuration
        const settings = await RestaurantSettings_1.default.findOne();
        const shouldAutoPrint = settings?.autoPrintKotForNewItems !== false && autoPrint;
        let additionalAmount = 0;
        const newlyAddedItems = []; // Track truly new items (not quantity updates)
        const newItemsForPrint = []; // Items that need KOT printing
        for (const newItem of items) {
            const menuItem = await MenuItem_1.default.findById(newItem.itemId);
            if (!menuItem) {
                return res.status(404).json({
                    message: `Menu item ${newItem.itemId} not found`,
                });
            }
            let itemPrice = menuItem.price;
            if (newItem.selectedVariation) {
                const variation = menuItem.variations?.find((v) => v.name === newItem.selectedVariation);
                if (variation) {
                    itemPrice = variation.price;
                }
            }
            let addOnTotal = 0;
            if (newItem.addOns && Array.isArray(newItem.addOns)) {
                for (const addOnName of newItem.addOns) {
                    const addOn = menuItem.addOns?.find((ao) => ao.name === addOnName);
                    if (addOn) {
                        addOnTotal += addOn.price;
                    }
                }
            }
            // Check if this exact item configuration already exists in the order
            const existingItemIndex = existingOrder.items.findIndex((existingItem) => existingItem.itemId.toString() === newItem.itemId &&
                existingItem.selectedVariation === (newItem.selectedVariation || "") &&
                JSON.stringify((existingItem.addOns || []).sort()) ===
                    JSON.stringify((newItem.addOns || []).sort()) &&
                existingItem.notes === (newItem.notes || ""));
            if (existingItemIndex >= 0) {
                // Update existing item quantity and total
                const existingItem = existingOrder.items[existingItemIndex];
                const previousQuantity = existingItem.quantity;
                existingItem.quantity += newItem.quantity;
                existingItem.totalPrice = (itemPrice + addOnTotal) * existingItem.quantity;
                additionalAmount += (itemPrice + addOnTotal) * newItem.quantity;
                // Track quantity increase for KOT printing (print only the additional quantity)
                if (menuItem.printToKitchen === true) {
                    newItemsForPrint.push({
                        itemId: {
                            name: menuItem.name
                        },
                        name: menuItem.name,
                        quantity: newItem.quantity, // Only print the additional quantity
                        notes: newItem.notes || "",
                        selectedVariation: newItem.selectedVariation || "",
                        addOns: newItem.addOns || []
                    });
                }
            }
            else {
                // Add new item to order
                const totalPrice = (itemPrice + addOnTotal) * newItem.quantity;
                additionalAmount += totalPrice;
                const newOrderItem = {
                    itemId: newItem.itemId,
                    quantity: newItem.quantity,
                    notes: newItem.notes || "",
                    selectedVariation: newItem.selectedVariation || "",
                    addOns: newItem.addOns || [],
                    itemPrice: itemPrice,
                    addOnPrice: addOnTotal,
                    totalPrice,
                    status: 'active',
                    kotPrinted: false,
                    kotPrintCount: 0,
                };
                existingOrder.items.push(newOrderItem);
                newlyAddedItems.push({
                    name: menuItem.name,
                    quantity: newItem.quantity,
                    variation: newItem.selectedVariation,
                    addOns: newItem.addOns,
                });
                // Add to print list if it needs kitchen preparation
                if (menuItem.printToKitchen === true) {
                    newItemsForPrint.push({
                        itemId: {
                            name: menuItem.name
                        },
                        name: menuItem.name,
                        quantity: newItem.quantity,
                        notes: newItem.notes || "",
                        selectedVariation: newItem.selectedVariation || "",
                        addOns: newItem.addOns || []
                    });
                }
            }
        }
        existingOrder.totalAmount += additionalAmount;
        await existingOrder.save();
        await existingOrder.populate("tableId items.itemId waiterId");
        // Auto-print KOT for newly added items (if enabled and there are items to print)
        let kotPrinted = false;
        if (shouldAutoPrint && newItemsForPrint.length > 0) {
            try {
                console.log(`\n==================== ADDITIONAL ITEMS PRINT DEBUG START ====================`);
                console.log(`📋 Order: ${existingOrder.orderNumber}, Additional Items: ${newItemsForPrint.length}`);
                // Check if print server is enabled
                const usePrintServer = await (0, printServerService_1.isPrintServerEnabled)();
                console.log(`🔧 Print Server Enabled: ${usePrintServer}`);
                if (usePrintServer) {
                    // Use print server API
                    console.log(`🌐 Using print server for additional items on order ${existingOrder.orderNumber}`);
                    const printData = {
                        orderId: `${existingOrder.orderNumber} - ADDITIONAL ITEMS`,
                        tableNo: existingOrder.tableId?.tableNumber || existingOrder.tableId?.number || 'N/A',
                        orderType: 'Dine-In - Additional Items',
                        items: newItemsForPrint.map((item) => ({
                            name: item.name,
                            quantity: item.quantity,
                            variations: item.selectedVariation ? [{
                                    name: 'Variation',
                                    option: item.selectedVariation
                                }] : [],
                            addOns: item.addOns?.map((addon) => ({
                                name: addon
                            })) || [],
                            notes: item.notes
                        }))
                    };
                    console.log(`📤 Sending additional items print request to server...`);
                    const printResult = await (0, printServerService_1.printKitchenOrderViaServer)(printData);
                    if (printResult.success) {
                        console.log(`✅ Additional items for order ${existingOrder.orderNumber} printed via server. Job ID: ${printResult.jobId}`);
                        kotPrinted = true;
                    }
                    else {
                        console.error(`❌ Print server failed for additional items on order ${existingOrder.orderNumber}: ${printResult.error}`);
                        console.log(`📋 Falling back to local printer...`);
                        // Fallback to local printing
                        const kitchenOrderData = {
                            orderNumber: existingOrder.orderNumber,
                            tableNumber: existingOrder.tableId?.tableNumber || existingOrder.tableId?.number || 'N/A',
                            items: newItemsForPrint
                        };
                        await (0, printer_1.printKOTForNewItems)(kitchenOrderData, true);
                        kotPrinted = true;
                    }
                }
                else {
                    // Use local printer directly
                    console.log(`🖨️  Using local printer for additional items on order ${existingOrder.orderNumber}`);
                    const kitchenOrderData = {
                        orderNumber: existingOrder.orderNumber,
                        tableNumber: existingOrder.tableId?.tableNumber || existingOrder.tableId?.number || 'N/A',
                        items: newItemsForPrint
                    };
                    await (0, printer_1.printKOTForNewItems)(kitchenOrderData, true);
                    kotPrinted = true;
                }
                // Mark items as KOT printed
                for (const item of existingOrder.items) {
                    const wasInPrintList = newItemsForPrint.some(printItem => printItem.name === item.itemId?.name);
                    if (wasInPrintList && !item.kotPrinted) {
                        item.kotPrinted = true;
                        item.kotPrintedAt = new Date();
                        item.kotPrintCount = (item.kotPrintCount || 0) + 1;
                    }
                }
                await existingOrder.save();
                console.log('✅ KOT auto-printed for additional items on order:', existingOrder.orderNumber, '- Items:', newItemsForPrint.length);
                console.log(`==================== ADDITIONAL ITEMS PRINT DEBUG END ====================\n`);
            }
            catch (printError) {
                console.error('❌ Auto-print KOT failed for additional items:', printError);
                // Don't fail the order update if printing fails
            }
        }
        else if (newItemsForPrint.length > 0) {
            console.log('ℹ️ Auto-print disabled or manual print requested for order:', existingOrder.orderNumber);
        }
        else {
            console.log('ℹ️ No kitchen items to print for order:', existingOrder.orderNumber, '- All new items are prepared at reception');
        }
        const io = (0, socket_1.getIO)();
        io.emit("orderUpdated", existingOrder);
        // Return response with metadata for frontend
        res.json({
            order: existingOrder,
            newItemsAdded: newlyAddedItems.length,
            newItems: newlyAddedItems,
            kotItemsCount: newItemsForPrint.length,
            kotPrinted,
            showKotConfirmation: settings?.showKotConfirmation !== false && newItemsForPrint.length > 0 && !shouldAutoPrint,
        });
    }
    catch (error) {
        console.error("Add items to order error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.addItemsToOrder = addItemsToOrder;
const updateOrderItem = async (req, res) => {
    try {
        const { orderId, itemIndex } = req.params;
        const { quantity, notes, addOns } = req.body;
        if (!quantity || quantity < 1) {
            return res.status(400).json({
                message: "Quantity must be at least 1",
            });
        }
        const order = await Order_1.default.findById(orderId).populate('tableId');
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Check if order can be edited (not billed and not served)
        if (order.isBilled) {
            return res.status(400).json({ message: "Cannot edit billed order" });
        }
        if (order.status === 'Served') {
            return res.status(400).json({ message: "Cannot edit served order" });
        }
        const itemIndexNum = parseInt(itemIndex);
        if (itemIndexNum < 0 || itemIndexNum >= order.items.length) {
            return res.status(400).json({ message: "Invalid item index" });
        }
        // Update the item
        const item = order.items[itemIndexNum];
        item.quantity = quantity;
        if (notes !== undefined)
            item.notes = notes;
        if (addOns !== undefined)
            item.addOns = addOns;
        // Recalculate item total price
        const menuItem = await MenuItem_1.default.findById(item.itemId);
        if (!menuItem) {
            return res.status(404).json({ message: "Menu item not found" });
        }
        let itemPrice = menuItem.price;
        if (item.selectedVariation) {
            const variation = menuItem.variations?.find((v) => v.name === item.selectedVariation);
            if (variation) {
                itemPrice = variation.price;
            }
        }
        let addOnPrice = 0;
        if (item.addOns && item.addOns.length > 0) {
            addOnPrice = item.addOns.reduce((sum, addOnName) => {
                const addOn = menuItem.addOns?.find((a) => a.name === addOnName);
                return sum + (addOn?.price || 0);
            }, 0);
        }
        item.itemPrice = itemPrice;
        item.addOnPrice = addOnPrice;
        item.totalPrice = (itemPrice + addOnPrice) * quantity;
        // Recalculate order total (exclude cancelled items)
        order.totalAmount = order.items.reduce((sum, orderItem) => {
            if (orderItem.status !== 'cancelled') {
                return sum + orderItem.totalPrice;
            }
            return sum;
        }, 0);
        await order.save();
        const io = (0, socket_1.getIO)();
        io.emit("orderUpdated", order);
        res.json(order);
    }
    catch (error) {
        console.error("Update order item error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.updateOrderItem = updateOrderItem;
const removeOrderItem = async (req, res) => {
    try {
        const { orderId, itemIndex } = req.params;
        const order = await Order_1.default.findById(orderId).populate('tableId');
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Check if order can be edited (not billed and not served)
        if (order.isBilled) {
            return res.status(400).json({ message: "Cannot edit billed order" });
        }
        if (order.status === 'Served') {
            return res.status(400).json({ message: "Cannot edit served order" });
        }
        const itemIndexNum = parseInt(itemIndex);
        if (itemIndexNum < 0 || itemIndexNum >= order.items.length) {
            return res.status(400).json({ message: "Invalid item index" });
        }
        // Remove the item
        order.items.splice(itemIndexNum, 1);
        // Check if order has any items left
        if (order.items.length === 0) {
            return res.status(400).json({ message: "Cannot remove all items from order. Delete the order instead." });
        }
        // Recalculate order total (exclude cancelled items)
        order.totalAmount = order.items.reduce((sum, orderItem) => {
            if (orderItem.status !== 'cancelled') {
                return sum + orderItem.totalPrice;
            }
            return sum;
        }, 0);
        await order.save();
        const io = (0, socket_1.getIO)();
        io.emit("orderUpdated", order);
        res.json(order);
    }
    catch (error) {
        console.error("Remove order item error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.removeOrderItem = removeOrderItem;
// Change table for an order
const changeOrderTable = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { newTableId } = req.body;
        if (!newTableId) {
            return res.status(400).json({ message: "New table ID is required" });
        }
        // Find the order
        const order = await Order_1.default.findById(orderId).populate('tableId');
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Check if order is already billed
        if (order.isBilled) {
            return res.status(400).json({ message: "Cannot change table for a billed order" });
        }
        const oldTableId = order.tableId;
        const oldTable = await Table_1.default.findById(oldTableId);
        // Check if new table exists
        const newTable = await Table_1.default.findById(newTableId);
        if (!newTable) {
            return res.status(404).json({ message: "New table not found" });
        }
        // Update order with new table
        order.tableId = newTableId;
        await order.save();
        await order.populate('tableId items.itemId waiterId');
        // Check if old table has any other active orders
        const oldTableActiveOrders = await Order_1.default.find({
            tableId: oldTableId,
            status: { $in: ['Pending', 'Preparing', 'Ready', 'Served'] },
            isBilled: false
        });
        // If no more active orders on old table, mark it as Available
        if (oldTableActiveOrders.length === 0) {
            await Table_1.default.findByIdAndUpdate(oldTableId, { status: "Available" });
        }
        // Mark new table as Occupied
        await Table_1.default.findByIdAndUpdate(newTableId, { status: "Occupied" });
        // Emit real-time updates
        const io = (0, socket_1.getIO)();
        // Emit table change event
        io.emit("orderTableChanged", {
            orderId: order._id,
            orderNumber: order.orderNumber,
            oldTableId,
            oldTableNumber: oldTable?.tableNumber,
            newTableId,
            newTableNumber: newTable.tableNumber,
            order: order.toObject(),
            timestamp: new Date().toISOString()
        });
        // Emit table status updates
        if (oldTableActiveOrders.length === 0) {
            io.emit("tableStatusUpdated", {
                tableId: oldTableId,
                tableNumber: oldTable?.tableNumber,
                status: "Available",
                table: (await Table_1.default.findById(oldTableId))?.toObject()
            });
        }
        io.emit("tableStatusUpdated", {
            tableId: newTableId,
            tableNumber: newTable.tableNumber,
            status: "Occupied",
            table: newTable.toObject()
        });
        console.log(`✅ Order ${order.orderNumber} moved from Table ${oldTable?.tableNumber} to Table ${newTable.tableNumber}`);
        res.json({
            message: "Table changed successfully",
            order,
            oldTable: oldTable?.toObject(),
            newTable: newTable.toObject()
        });
    }
    catch (error) {
        console.error("Change order table error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.changeOrderTable = changeOrderTable;
// Merge multiple orders into one
const mergeOrders = async (req, res) => {
    try {
        const { orderIds, targetTableId } = req.body;
        if (!orderIds || !Array.isArray(orderIds) || orderIds.length < 2) {
            return res.status(400).json({ message: "At least 2 order IDs are required to merge" });
        }
        // Find all orders
        const orders = await Order_1.default.find({
            _id: { $in: orderIds },
            isBilled: false
        }).populate('tableId items.itemId waiterId');
        if (orders.length !== orderIds.length) {
            return res.status(404).json({ message: "Some orders not found or already billed" });
        }
        // Determine target table
        let targetTable;
        if (targetTableId) {
            targetTable = await Table_1.default.findById(targetTableId);
            if (!targetTable) {
                return res.status(404).json({ message: "Target table not found" });
            }
        }
        else {
            // Use the first order's table as target
            targetTable = await Table_1.default.findById(orders[0].tableId);
            if (!targetTable) {
                return res.status(404).json({ message: "Target table not found" });
            }
        }
        // Create merged order
        const allItems = [];
        const sourceTableIds = new Set();
        const sourceOrderNumbers = [];
        let totalAmount = 0;
        // Collect all items from all orders
        orders.forEach(order => {
            sourceTableIds.add(order.tableId._id.toString());
            sourceOrderNumbers.push(order.orderNumber);
            order.items.forEach((item) => {
                // Only include active items (not cancelled)
                if (item.status !== 'cancelled') {
                    allItems.push({
                        itemId: item.itemId._id,
                        quantity: item.quantity,
                        selectedVariation: item.selectedVariation,
                        addOns: item.addOns,
                        notes: item.notes,
                        itemPrice: item.itemPrice,
                        addOnPrice: item.addOnPrice,
                        totalPrice: item.totalPrice,
                        status: 'active'
                    });
                    totalAmount += item.totalPrice;
                }
            });
        });
        // Create new merged order
        const mergedOrder = new Order_1.default({
            tableId: targetTable._id,
            items: allItems,
            status: "Served", // Typically merged orders are ready for billing
            orderNumber: generateOrderNumber(),
            waiterId: req.user?.id,
            sessionId: orders[0].sessionId || new mongoose_1.default.Types.ObjectId().toString(),
            totalAmount,
            mergedFrom: orderIds,
            mergedOrderNumbers: sourceOrderNumbers,
            mergedTables: Array.from(sourceTableIds)
        });
        await mergedOrder.save();
        await mergedOrder.populate('tableId items.itemId waiterId');
        // Mark source orders as merged
        await Order_1.default.updateMany({ _id: { $in: orderIds } }, {
            isMerged: true,
            mergedInto: mergedOrder._id,
            status: "Merged"
        });
        // Update table statuses
        const oldTables = Array.from(sourceTableIds);
        for (const tableId of oldTables) {
            const hasActiveOrders = await Order_1.default.findOne({
                tableId,
                status: { $in: ['Pending', 'Preparing', 'Ready', 'Served'] },
                isBilled: false,
                isMerged: false
            });
            if (!hasActiveOrders) {
                await Table_1.default.findByIdAndUpdate(tableId, { status: "Available" });
            }
        }
        // Ensure target table is Occupied
        await Table_1.default.findByIdAndUpdate(targetTable._id, { status: "Occupied" });
        // Emit real-time updates
        const io = (0, socket_1.getIO)();
        io.emit("ordersMerged", {
            mergedOrderId: mergedOrder._id,
            mergedOrderNumber: mergedOrder.orderNumber,
            sourceOrderIds: orderIds,
            sourceOrderNumbers,
            targetTableId: targetTable._id,
            targetTableNumber: targetTable.tableNumber,
            mergedOrder: mergedOrder.toObject(),
            timestamp: new Date().toISOString()
        });
        // Emit table updates
        for (const tableId of oldTables) {
            const table = await Table_1.default.findById(tableId);
            const hasActiveOrders = await Order_1.default.findOne({
                tableId,
                status: { $in: ['Pending', 'Preparing', 'Ready', 'Served'] },
                isBilled: false,
                isMerged: false
            });
            io.emit("tableStatusUpdated", {
                tableId,
                tableNumber: table?.tableNumber,
                status: hasActiveOrders ? "Occupied" : "Available",
                table: table?.toObject()
            });
        }
        console.log(`✅ Merged ${orders.length} orders into order ${mergedOrder.orderNumber}`);
        res.status(201).json({
            message: "Orders merged successfully",
            mergedOrder,
            sourceOrders: orders.map(o => ({
                orderId: o._id,
                orderNumber: o.orderNumber,
                tableNumber: o.tableId?.tableNumber || o.tableId?.number || 'N/A'
            }))
        });
    }
    catch (error) {
        console.error("Merge orders error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.mergeOrders = mergeOrders;
/**
 * Cancel a specific item within an order
 * PUT /orders/:orderId/items/:itemIndex/cancel
 */
const cancelOrderItem = async (req, res) => {
    try {
        const { orderId, itemIndex } = req.params;
        const { cancellationReason } = req.body;
        const userId = req.user?.id;
        // Validate input
        if (!orderId || !itemIndex) {
            return res.status(400).json({
                message: "Order ID and item index are required"
            });
        }
        const itemIndexNum = parseInt(itemIndex);
        if (isNaN(itemIndexNum) || itemIndexNum < 0) {
            return res.status(400).json({
                message: "Invalid item index"
            });
        }
        // Find the order
        const order = await Order_1.default.findById(orderId).populate('tableId');
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Check if order is already billed
        if (order.isBilled) {
            return res.status(400).json({
                message: "Cannot cancel items from a billed order"
            });
        }
        // Check if order is already cancelled
        if (order.isCancelled) {
            return res.status(400).json({
                message: "Cannot cancel items from a cancelled order"
            });
        }
        // Check if item index exists
        if (itemIndexNum >= order.items.length) {
            return res.status(404).json({
                message: "Item not found in order"
            });
        }
        // Check if item is already cancelled
        if (order.items[itemIndexNum].status === 'cancelled') {
            return res.status(400).json({
                message: "Item is already cancelled"
            });
        }
        // Cancel the item
        const cancelledItem = order.items[itemIndexNum];
        order.items[itemIndexNum].status = 'cancelled';
        order.items[itemIndexNum].cancelledAt = new Date();
        order.items[itemIndexNum].cancellationReason = cancellationReason || 'No reason provided';
        // Recalculate order total (exclude cancelled items)
        let newTotal = 0;
        for (const item of order.items) {
            if (item.status !== 'cancelled') {
                newTotal += item.totalPrice;
            }
        }
        order.totalAmount = newTotal;
        // Check if all items are cancelled
        const allItemsCancelled = order.items.every(item => item.status === 'cancelled');
        if (allItemsCancelled) {
            order.status = 'Cancelled';
            order.isCancelled = true;
            order.cancelledAt = new Date();
            order.cancelledBy = new mongoose_1.default.Types.ObjectId(userId);
            order.cancellationReason = 'All items cancelled';
        }
        await order.save();
        console.log(`✅ Cancelled item ${itemIndexNum} from order ${order.orderNumber}`);
        // Emit socket events for real-time updates
        const io = (0, socket_1.getIO)();
        io.emit('order-updated', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            tableId: order.tableId,
            order: order.toObject(),
            timestamp: new Date().toISOString()
        });
        // If order is fully cancelled, emit order cancellation event
        if (allItemsCancelled) {
            io.emit('order-cancelled', {
                orderId: order._id,
                orderNumber: order.orderNumber,
                tableId: order.tableId,
                order: order.toObject(),
                timestamp: new Date().toISOString()
            });
            // Update table status if no more active orders
            const hasActiveOrders = await Order_1.default.findOne({
                tableId: order.tableId,
                _id: { $ne: order._id }, // Exclude the current order
                status: { $in: ['Pending', 'Cooking', 'Ready', 'Served'] },
                isBilled: false,
                $or: [
                    { isCancelled: { $exists: false } },
                    { isCancelled: false }
                ]
            });
            if (!hasActiveOrders) {
                const table = await Table_1.default.findById(order.tableId);
                if (table) {
                    console.log(`🔄 Setting table ${table.tableNumber} to Available (all items cancelled)`);
                    table.status = 'Available';
                    await table.save();
                    // Emit comprehensive table status update events
                    const tableUpdateData = {
                        tableId: table._id,
                        tableNumber: table.tableNumber,
                        status: 'Available',
                        table: table.toObject(),
                        timestamp: new Date().toISOString()
                    };
                    io.emit('table-status-changed', tableUpdateData);
                    io.emit('table-updated', tableUpdateData);
                    io.emit('tableStatusUpdated', tableUpdateData);
                }
            }
        }
        res.status(200).json({
            message: "Item cancelled successfully",
            order,
            cancelledItem: {
                index: itemIndexNum,
                itemId: cancelledItem.itemId,
                quantity: cancelledItem.quantity,
                totalPrice: cancelledItem.totalPrice
            },
            allItemsCancelled
        });
    }
    catch (error) {
        console.error("Cancel order item error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.cancelOrderItem = cancelOrderItem;
/**
 * Cancel an entire order
 * PUT /orders/:id/cancel
 */
const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { cancellationReason } = req.body;
        const userId = req.user?.id;
        // Validate input
        if (!id) {
            return res.status(400).json({ message: "Order ID is required" });
        }
        // Find the order
        const order = await Order_1.default.findById(id).populate('tableId');
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Check if order is already billed
        if (order.isBilled) {
            return res.status(400).json({
                message: "Cannot cancel a billed order. Please process a refund instead."
            });
        }
        // Check if order is already cancelled
        if (order.isCancelled || order.status === 'Cancelled') {
            return res.status(400).json({
                message: "Order is already cancelled"
            });
        }
        // Reverse automatic stock deduction if order was not billed yet
        if (!order.isBilled) {
            try {
                const reverseResult = await (0, autoStockDeductionService_1.reverseAutoStockDeduction)(order._id, new mongoose_1.default.Types.ObjectId(userId));
                if (reverseResult.success) {
                    console.log(`✅ Automatic stock reversed for cancelled order ${order.orderNumber}:`, reverseResult.deductions);
                }
                else {
                    console.warn(`⚠️ No automatic stock to reverse for order ${order.orderNumber}`);
                }
            }
            catch (stockError) {
                console.error('Error reversing automatic stock:', stockError);
                // Continue with cancellation even if stock reversal fails
            }
        }
        // Cancel the order
        order.status = 'Cancelled';
        order.isCancelled = true;
        order.cancelledAt = new Date();
        order.cancelledBy = new mongoose_1.default.Types.ObjectId(userId);
        order.cancellationReason = cancellationReason || 'No reason provided';
        // Mark all items as cancelled
        for (const item of order.items) {
            if (item.status !== 'cancelled') {
                item.status = 'cancelled';
                item.cancelledAt = new Date();
                item.cancellationReason = cancellationReason || 'Order cancelled';
            }
        }
        // Set total to 0 since all items are cancelled
        order.totalAmount = 0;
        await order.save();
        console.log(`✅ Cancelled order ${order.orderNumber} for table ${order.tableId?.tableNumber || order.tableId}`);
        // Emit socket events for real-time updates
        const io = (0, socket_1.getIO)();
        io.emit('order-cancelled', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            tableId: order.tableId,
            order: order.toObject(),
            timestamp: new Date().toISOString()
        });
        io.emit('order-updated', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            tableId: order.tableId,
            order: order.toObject(),
            timestamp: new Date().toISOString()
        });
        // Update table status if no more active orders
        console.log(`🔍 Checking for other active orders at table ${order.tableId?.tableNumber || order.tableId}...`);
        const activeOrders = await Order_1.default.find({
            tableId: order.tableId,
            _id: { $ne: order._id }, // Exclude the current order
            isBilled: false,
            $or: [
                { isCancelled: { $exists: false } },
                { isCancelled: false }
            ]
        });
        console.log(`📊 Found ${activeOrders.length} other orders at this table:`, activeOrders.map(o => ({ id: o._id, number: o.orderNumber, status: o.status, cancelled: o.isCancelled, billed: o.isBilled })));
        const hasActiveOrders = activeOrders.some(o => ['Pending', 'Cooking', 'Ready', 'Served'].includes(o.status) && !o.isCancelled && !o.isBilled);
        let updatedTable = null;
        if (!hasActiveOrders) {
            const table = await Table_1.default.findById(order.tableId);
            if (table) {
                console.log(`🔄 Setting table ${table.tableNumber} to Available (no active orders after cancellation)`);
                table.status = 'Available';
                await table.save();
                updatedTable = table;
                // Emit comprehensive table status update events
                const tableUpdateData = {
                    tableId: table._id,
                    tableNumber: table.tableNumber,
                    status: 'Available',
                    table: table.toObject(),
                    timestamp: new Date().toISOString()
                };
                io.emit('table-status-changed', tableUpdateData);
                io.emit('table-updated', tableUpdateData);
                io.emit('tableStatusUpdated', tableUpdateData);
                console.log(`✅ Table ${table.tableNumber} status updated to Available and events emitted`);
            }
        }
        else {
            console.log(`⚠️ Table still has active orders, keeping current status`);
        }
        res.status(200).json({
            message: "Order cancelled successfully",
            order,
            tableStatus: updatedTable?.status || 'Occupied'
        });
    }
    catch (error) {
        console.error("Cancel order error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.cancelOrder = cancelOrder;
/**
 * Update stock usage for order items (manual meat quantities)
 * PUT /api/orders/:orderId/stock-usage
 */
const updateStockUsage = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { itemIndex, stockItemsUsed } = req.body;
        if (!orderId || itemIndex === undefined || !stockItemsUsed) {
            return res.status(400).json({
                message: "Order ID, item index, and stock items used are required",
            });
        }
        const order = await Order_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.isBilled) {
            return res.status(400).json({
                message: "Cannot update stock usage for a billed order",
            });
        }
        if (itemIndex < 0 || itemIndex >= order.items.length) {
            return res.status(400).json({ message: "Invalid item index" });
        }
        // Update the stock items used for this order item
        order.items[itemIndex].stockItemsUsed = stockItemsUsed;
        order.markModified('items');
        await order.save();
        await order.populate("items.itemId");
        res.json({
            message: "Stock usage updated successfully",
            order,
        });
    }
    catch (error) {
        console.error("Update stock usage error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.updateStockUsage = updateStockUsage;
/**
 * Get available manual stock items (meats) for an order item
 * GET /api/orders/manual-stock-items/:menuItemId
 */
const getManualStockItemsForMenuItem = async (req, res) => {
    try {
        const { menuItemId } = req.params;
        const menuItem = await MenuItem_1.default.findById(menuItemId).populate({
            path: 'recipe.stockItemId',
            match: { deductionType: 'manual', isActive: true }
        });
        if (!menuItem) {
            return res.status(404).json({ message: "Menu item not found" });
        }
        // Filter out any null stock items (those that didn't match the filter)
        const manualStockItems = menuItem.recipe
            .filter((recipeItem) => recipeItem.stockItemId !== null)
            .map((recipeItem) => ({
            stockItemId: recipeItem.stockItemId._id,
            name: recipeItem.stockItemId.name,
            unit: recipeItem.stockItemId.unit,
            currentStock: recipeItem.stockItemId.quantity,
            costPerUnit: recipeItem.stockItemId.costPerUnit,
            defaultQuantity: recipeItem.quantity, // Default from recipe
        }));
        res.json({
            menuItemName: menuItem.name,
            manualStockItems,
        });
    }
    catch (error) {
        console.error("Get manual stock items error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getManualStockItemsForMenuItem = getManualStockItemsForMenuItem;
