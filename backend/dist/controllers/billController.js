"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printBill = exports.printBillById = exports.getBillPreview = exports.getBill = exports.getAllBills = exports.getBillsByTable = exports.createBill = void 0;
const Bill_1 = __importDefault(require("../models/Bill"));
const Order_1 = __importDefault(require("../models/Order"));
const Table_1 = __importDefault(require("../models/Table"));
const Customer_1 = __importDefault(require("../models/Customer"));
const socket_1 = require("../utils/socket");
const notificationService_1 = require("../services/notificationService");
const printer_1 = require("../utils/printer");
const printServerService_1 = require("../services/printServerService");
const mongoose_1 = __importDefault(require("mongoose"));
const RestaurantSettings_1 = __importDefault(require("../models/RestaurantSettings"));
const manualStockDeductionService_1 = require("../services/manualStockDeductionService");
const directManualStockDeduction_1 = require("../services/directManualStockDeduction");
const generateBillNumber = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
    return `BILL-${timestamp.slice(-6)}${random}`;
};
const createBill = async (req, res) => {
    try {
        const { tableId, paymentMethods, discount = 0, selectedOrders, customerId, manualStockEntries = [], // NEW: Manual stock entries from billing modal
         } = req.body;
        if (!tableId ||
            !paymentMethods ||
            !Array.isArray(paymentMethods) ||
            paymentMethods.length === 0) {
            return res.status(400).json({
                message: "Table ID and payment methods are required",
            });
        }
        // Validate payment methods
        const totalPayment = paymentMethods.reduce((sum, method) => sum + (parseFloat(method.amount.toString()) || 0), 0);
        if (totalPayment <= 0) {
            return res.status(400).json({
                message: "Total payment amount must be greater than 0",
            });
        }
        // Check if credit payment is used and validate customer
        const creditPayment = paymentMethods.find((method) => method.type === "Credit");
        let customer = null;
        if (creditPayment) {
            if (!customerId) {
                return res.status(400).json({
                    message: "Customer must be selected when using credit payment",
                });
            }
            if (!mongoose_1.default.Types.ObjectId.isValid(customerId)) {
                return res.status(400).json({ message: "Invalid customer ID" });
            }
            customer = await Customer_1.default.findById(customerId);
            if (!customer) {
                return res.status(404).json({ message: "Customer not found" });
            }
            if (!customer.isActive) {
                return res
                    .status(400)
                    .json({ message: "Customer account is inactive" });
            }
        }
        const table = await Table_1.default.findById(tableId);
        if (!table) {
            return res.status(404).json({ message: "Table not found" });
        }
        // Get served orders for this table (exclude cancelled orders)
        let query = {
            tableId,
            status: "Served",
            $or: [
                { isCancelled: { $exists: false } },
                { isCancelled: false }
            ]
        };
        // If specific orders are selected, filter by those
        if (selectedOrders && Array.isArray(selectedOrders)) {
            query._id = { $in: selectedOrders };
        }
        const allServedOrders = await Order_1.default.find(query).populate("items.itemId");
        if (allServedOrders.length === 0) {
            return res.status(400).json({
                message: "No served orders found for this table",
            });
        }
        // Check if there are unbilled served orders
        const servedOrders = allServedOrders.filter((order) => !order.isBilled);
        const billedServedOrders = allServedOrders.filter((order) => order.isBilled);
        if (servedOrders.length === 0) {
            if (billedServedOrders.length > 0) {
                return res.status(400).json({
                    message: "This table has already been billed. Orders are already processed.",
                });
            }
            else {
                return res.status(400).json({
                    message: "No unbilled served orders found for this table",
                });
            }
        }
        // Calculate subtotal excluding cancelled items
        let subtotal = 0;
        for (const order of servedOrders) {
            for (const item of order.items) {
                // Only include active items (not cancelled)
                if (item.status !== 'cancelled') {
                    subtotal += item.totalPrice;
                }
            }
        }
        // Get tax rate from restaurant settings
        const settings = await RestaurantSettings_1.default.findOne();
        const taxRate = settings?.taxRate || 0.0;
        const tax = subtotal * taxRate;
        const discountAmount = parseFloat(discount.toString()) || 0;
        // Validate discount doesn't exceed subtotal + tax
        if (discountAmount > subtotal + tax) {
            return res.status(400).json({
                message: `Discount (रू ${discountAmount.toFixed(2)}) cannot exceed bill subtotal + tax (रू ${(subtotal + tax).toFixed(2)})`,
            });
        }
        // Validate payment doesn't exceed bill total
        const total = subtotal + tax - discountAmount;
        if (totalPayment > total) {
            return res.status(400).json({
                message: `Payment total (रू ${totalPayment.toFixed(2)}) cannot exceed bill total (रू ${total.toFixed(2)})`,
            });
        }
        // Validate that payment methods total matches bill total
        if (Math.abs(totalPayment - total) > 0.01) {
            return res.status(400).json({
                message: `Payment total (रू ${totalPayment.toFixed(2)}) does not match bill total (रू ${total.toFixed(2)})`,
            });
        }
        const creditAmount = creditPayment
            ? parseFloat(creditPayment.amount.toString()) || 0
            : 0;
        // Validate manual stock quantities before billing
        // Check if all manual stock items (meats) have quantities entered
        const allOrderItems = servedOrders.flatMap(order => order.items);
        const validation = (0, manualStockDeductionService_1.validateManualStockQuantities)(allOrderItems);
        if (!validation.valid) {
            return res.status(400).json({
                message: 'Please input meat usage before billing',
                error: 'MISSING_STOCK_QUANTITIES',
                missingItems: validation.missingItems,
                details: 'Some menu items require manual stock quantity input (meat usage). Please enter the quantities used before creating the bill.'
            });
        }
        const bill = new Bill_1.default({
            tableId,
            orders: servedOrders.map((order) => order._id),
            subtotal,
            tax,
            discount: discountAmount,
            total,
            paymentMethods: paymentMethods.map((method) => ({
                type: method.type,
                amount: parseFloat(method.amount.toString()) || 0,
            })),
            billNumber: generateBillNumber(),
            customerId: customerId || undefined,
            creditAmount,
        });
        await bill.save();
        await bill.populate("tableId orders");
        await bill.populate({
            path: "orders",
            populate: {
                path: "items.itemId",
                select: "name"
            }
        });
        // Deduct manual stock items (meats) on billing
        // Two methods:
        // 1. Direct entries from billing modal (entered by reception)
        // 2. Pre-entered stock usage in orders (entered by kitchen/waiters)
        const userId = req.user?.id;
        if (userId) {
            try {
                // Method 1: Deduct direct manual stock entries from billing modal
                if (manualStockEntries && manualStockEntries.length > 0) {
                    console.log('📦 Processing direct manual stock entries from billing modal:', manualStockEntries.length, 'items');
                    const directDeductionResult = await (0, directManualStockDeduction_1.deductDirectManualStock)(manualStockEntries, bill._id, new mongoose_1.default.Types.ObjectId(userId));
                    if (directDeductionResult.success) {
                        console.log(`✅ Direct manual stock deducted at billing:`, directDeductionResult.deductions);
                        console.log(`💰 Total COGS from manual stock: रू ${directDeductionResult.totalCOGS?.toFixed(2) || 0}`);
                    }
                    else {
                        console.error(`❌ Direct manual stock deduction failed:`, directDeductionResult.message);
                        // Continue with billing even if stock deduction fails
                    }
                }
                // Method 2: Deduct stock from order items (pre-entered quantities)
                // Collect all order items from all served orders
                const allOrderItems = servedOrders.flatMap(order => order.items);
                // Validate that all manual stock items have quantities entered
                const validation = (0, manualStockDeductionService_1.validateManualStockQuantities)(allOrderItems);
                if (!validation.valid) {
                    console.warn('⚠️ Manual stock validation warnings:', validation.missingItems);
                    // Continue anyway - missing items just won't be deducted
                }
                // Deduct manual stock items from orders
                for (const order of servedOrders) {
                    const deductionResult = await (0, manualStockDeductionService_1.deductManualStockOnBilling)(order.items, order._id, new mongoose_1.default.Types.ObjectId(userId));
                    if (deductionResult.success && deductionResult.deductions && deductionResult.deductions.length > 0) {
                        console.log(`✅ Order-based manual stock deducted for order ${order.orderNumber}:`, deductionResult.deductions);
                    }
                }
            }
            catch (stockError) {
                console.error('Error deducting manual stock:', stockError);
                // Don't fail the bill creation if stock deduction fails
            }
        }
        // Send bill creation notification
        try {
            await notificationService_1.notificationService.notifyBillCreated({
                ...bill.toObject(),
                tableNumber: table.tableNumber
            });
        }
        catch (notificationError) {
            console.error("Notification error:", notificationError);
        }
        // Handle credit transaction if credit payment is used
        if (creditPayment && customer && creditAmount > 0) {
            customer.creditBalance += creditAmount;
            customer.totalCreditGiven += creditAmount;
            customer.creditTransactions.push({
                type: "Credit",
                amount: creditAmount,
                billId: bill._id,
                description: `Credit from Bill #${bill.billNumber}`,
                createdAt: new Date(),
            });
            await customer.save();
        }
        // Mark orders as billed and move to history
        const updatePromises = servedOrders.map((order) => Order_1.default.findByIdAndUpdate(order._id, {
            isBilled: true,
            billedAt: new Date(),
            billId: bill._id,
        }));
        await Promise.all(updatePromises);
        // Update table status to Available and get the updated table
        const updatedTable = await Table_1.default.findByIdAndUpdate(tableId, { status: "Available" }, { new: true } // Return the updated document
        );
        if (!updatedTable) {
            return res.status(404).json({ message: "Table not found after update" });
        }
        console.log('✅ Table status updated to Available:', updatedTable.tableNumber);
        // Send table status notification
        try {
            await notificationService_1.notificationService.notifyTableStatusUpdated({
                tableId,
                tableNumber: updatedTable.tableNumber,
                status: "Available"
            });
        }
        catch (notificationError) {
            console.error("Notification error:", notificationError);
        }
        // Emit real-time updates
        const io = (0, socket_1.getIO)();
        console.log('Emitting bill events for:', bill.billNumber);
        // Enhanced bill data with table information
        const enrichedBillData = {
            ...bill.toObject(),
            tableNumber: updatedTable.tableNumber
        };
        // Role-based notifications
        (0, socket_1.emitBillNotification)('billCreated', enrichedBillData);
        // Comprehensive bill creation events
        io.emit("bill-created", {
            ...enrichedBillData,
            timestamp: new Date().toISOString()
        });
        io.emit("bill-updated", {
            type: "created",
            bill: enrichedBillData,
            billId: bill._id,
            tableId,
            tableNumber: updatedTable.tableNumber,
            timestamp: new Date().toISOString()
        });
        // Enhanced table status update with UPDATED table data
        const tableUpdateData = {
            tableId,
            tableNumber: updatedTable.tableNumber,
            status: "Available",
            previousStatus: "Waiting for Bill",
            table: updatedTable.toObject(), // Use updated table object
            billId: bill._id,
            billNumber: bill.billNumber,
            timestamp: new Date().toISOString()
        };
        console.log('📢 Emitting table status update:', {
            tableNumber: updatedTable.tableNumber,
            status: tableUpdateData.status
        });
        (0, socket_1.emitTableNotification)('tableStatusUpdated', tableUpdateData);
        io.emit("table-updated", tableUpdateData);
        io.emit("table-status-changed", tableUpdateData);
        // Enhanced orders updated event
        io.emit("orders-updated", {
            type: "billed",
            orderIds: servedOrders.map((o) => o._id),
            orders: servedOrders.map((o) => ({ ...o.toObject(), isBilled: true, billedAt: new Date().toISOString() })),
            tableId,
            tableNumber: updatedTable.tableNumber,
            billId: bill._id,
            billNumber: bill.billNumber,
            timestamp: new Date().toISOString()
        });
        // Legacy events for backward compatibility
        io.emit("billCreated", bill);
        io.emit("tableStatusUpdate", { tableId, status: "Available" });
        io.emit("tableStatusUpdated", tableUpdateData);
        io.emit("billUpdate", { type: "created", bill });
        io.emit("refreshBills");
        io.emit("refreshTables");
        io.emit("refreshOrders");
        // Emit billCreated event for auto-printing
        io.emit("billCreated", {
            billId: bill._id,
            billNumber: bill.billNumber,
            tableNumber: updatedTable.tableNumber,
            total: bill.total,
            itemsCount: bill.orders.reduce((count, order) => count + order.items.length, 0),
            createdAt: bill.createdAt,
            createdBy: req.user?.id
        });
        // Trigger bill printing
        try {
            console.log(`\n==================== BILL PRINT DEBUG START ====================`);
            console.log(`💵 Bill: ${bill.billNumber}, Table: ${table.tableNumber}, Total: ₹${bill.total}`);
            await (0, exports.printBill)(bill);
            console.log(`==================== BILL PRINT DEBUG END ====================\n`);
        }
        catch (error) {
            console.error(`❌ BILL PRINT ERROR for ${bill.billNumber}:`, error);
            console.error(`Error details:`, {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                code: error.code
            });
            console.log(`==================== BILL PRINT DEBUG END (ERROR) ====================\n`);
            // Don't fail bill creation if printing fails
        }
        res.status(201).json(bill);
    }
    catch (error) {
        console.error("Create bill error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.createBill = createBill;
const getBillsByTable = async (req, res) => {
    try {
        const { tableId } = req.params;
        const bills = await Bill_1.default.find({ tableId })
            .populate("tableId")
            .populate("orders")
            .sort({ createdAt: -1 });
        res.json(bills);
    }
    catch (error) {
        console.error("Get bills by table error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getBillsByTable = getBillsByTable;
const getAllBills = async (req, res) => {
    try {
        const { startDate, endDate, limit } = req.query;
        let filter = {};
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate)
                filter.createdAt.$gte = new Date(startDate);
            if (endDate)
                filter.createdAt.$lte = new Date(endDate);
        }
        const bills = await Bill_1.default.find(filter)
            .populate("tableId")
            .sort({ createdAt: -1 })
            .limit(limit ? parseInt(limit) : 100);
        res.json(bills);
    }
    catch (error) {
        console.error("Get all bills error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getAllBills = getAllBills;
const getBill = async (req, res) => {
    try {
        const { id } = req.params;
        const bill = await Bill_1.default.findById(id)
            .populate("tableId")
            .populate({
            path: "orders",
            populate: {
                path: "items.itemId",
            },
        });
        if (!bill) {
            return res.status(404).json({ message: "Bill not found" });
        }
        res.json(bill);
    }
    catch (error) {
        console.error("Get bill error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getBill = getBill;
const getBillPreview = async (req, res) => {
    try {
        const { tableId } = req.params;
        const { discount = 0, selectedOrders } = req.query;
        const table = await Table_1.default.findById(tableId);
        if (!table) {
            return res.status(404).json({ message: "Table not found" });
        }
        // Get served orders for this table (exclude cancelled orders)
        let query = {
            tableId,
            status: "Served",
            $or: [
                { isCancelled: { $exists: false } },
                { isCancelled: false }
            ]
        };
        // If specific orders are selected, filter by those
        if (selectedOrders) {
            const orderIds = selectedOrders.split(",");
            query._id = { $in: orderIds };
        }
        const servedOrders = await Order_1.default.find(query).populate("items.itemId waiterId", "name");
        if (servedOrders.length === 0) {
            return res.status(400).json({
                message: "No served orders found for this table",
            });
        }
        // Check if selected orders are already billed
        const billedServedOrders = servedOrders.filter((order) => order.isBilled);
        const unbilledServedOrders = servedOrders.filter((order) => !order.isBilled);
        if (unbilledServedOrders.length === 0 && billedServedOrders.length > 0) {
            return res.status(400).json({
                message: "This table has already been billed. Cannot generate new bill preview.",
                alreadyBilled: true,
            });
        }
        let subtotal = 0;
        const orderDetails = [];
        // Only process unbilled served orders and exclude cancelled items
        for (const order of unbilledServedOrders) {
            let orderTotal = 0;
            const items = [];
            for (const item of order.items) {
                // Only include active items (not cancelled)
                if (item.status !== 'cancelled') {
                    orderTotal += item.totalPrice;
                    items.push({
                        name: item.itemId?.name || "Unknown Item",
                        quantity: item.quantity,
                        price: item.itemPrice,
                        total: item.totalPrice,
                        notes: item.notes,
                        selectedVariation: item.selectedVariation,
                        addOns: item.addOns,
                    });
                }
            }
            subtotal += orderTotal;
            orderDetails.push({
                orderNumber: order.orderNumber,
                orderTime: order.createdAt,
                waiter: order.waiterId?.name || "Unknown",
                items,
                orderTotal,
            });
        }
        // Get tax rate from restaurant settings
        const previewSettings = await RestaurantSettings_1.default.findOne();
        const taxRate = previewSettings?.taxRate || 0.0;
        const tax = subtotal * taxRate;
        const discountAmount = parseFloat(discount) || 0;
        const total = subtotal + tax - discountAmount;
        const preview = {
            table: {
                number: table.tableNumber,
                _id: table._id,
            },
            orders: orderDetails,
            subtotal,
            tax,
            taxRate: taxRate * 100,
            discount: discountAmount,
            total,
            orderCount: unbilledServedOrders.length,
            createdAt: new Date(),
            alreadyBilled: false,
        };
        res.json(preview);
    }
    catch (error) {
        console.error("Get bill preview error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getBillPreview = getBillPreview;
const printBillById = async (req, res) => {
    try {
        const { id } = req.params;
        const bill = await Bill_1.default.findById(id)
            .populate("tableId")
            .populate({
            path: "orders",
            populate: {
                path: "items.itemId waiterId",
                select: "name",
            },
        });
        if (!bill) {
            return res.status(404).json({ message: "Bill not found" });
        }
        // Increment print count and update bill
        const updatedBill = await Bill_1.default.findByIdAndUpdate(id, {
            $inc: { printCount: 1 },
            isPrinted: true,
            printedAt: new Date()
        }, { new: true });
        // Emit real-time update for print count
        const io = (0, socket_1.getIO)();
        if (io) {
            io.emit('billPrintUpdated', {
                billId: id,
                printCount: updatedBill?.printCount || 1
            });
        }
        await (0, exports.printBill)(bill);
        res.json({
            message: "Bill printed successfully",
            printCount: updatedBill?.printCount || 1
        });
    }
    catch (error) {
        console.error("Print bill by ID error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.printBillById = printBillById;
const printBill = async (bill, cutPaper = true) => {
    try {
        console.log(`🖨️  Processing print for bill ${bill.billNumber}${cutPaper ? ' (will cut)' : ' (continuous)'}`);
        // Check if print server is enabled
        const usePrintServer = await (0, printServerService_1.isPrintServerEnabled)();
        console.log(`🔧 Print Server Enabled: ${usePrintServer}`);
        if (usePrintServer) {
            // Use print server API
            console.log(`🌐 Using print server for bill ${bill.billNumber}`);
            // Get restaurant settings for bill header
            const settings = await RestaurantSettings_1.default.findOne();
            // Prepare bill items with proper format
            let billItems;
            // For split bills, use splitGuests data (only assigned items)
            if (bill.isSplit && bill.splitGuests && bill.splitGuests.length > 0) {
                console.log('📋 Using splitGuests data for split bill items');
                const guestData = bill.splitGuests[0]; // Get this split's guest data
                billItems = guestData.items.map((splitItem) => {
                    // Find the actual item from orders to get full details
                    let itemDetails = null;
                    for (const order of bill.orders) {
                        const foundItem = order.items[splitItem.orderItemIndex];
                        if (foundItem) {
                            itemDetails = foundItem;
                            break;
                        }
                    }
                    return {
                        name: itemDetails?.itemId?.name || splitItem.name || 'Unknown Item',
                        quantity: splitItem.quantity, // Use split quantity, not original
                        itemPrice: splitItem.itemPrice || 0,
                        price: splitItem.itemPrice || 0,
                        addOnPrice: splitItem.addOnPrice || 0,
                        totalPrice: splitItem.totalPrice || 0,
                        variations: itemDetails?.selectedVariation ? [{
                                name: 'Variation',
                                option: itemDetails.selectedVariation
                            }] : [],
                        addOns: itemDetails?.addOns || [],
                        selectedVariation: itemDetails?.selectedVariation,
                        notes: itemDetails?.notes
                    };
                });
                console.log(`📋 Split bill items count: ${billItems.length}`);
            }
            else {
                // Regular bill - use all items from all orders
                console.log('📋 Using all order items for regular bill');
                billItems = bill.orders.flatMap((order) => order.items.map((item) => ({
                    name: item.itemId?.name || item.name || 'Unknown Item',
                    quantity: item.quantity,
                    itemPrice: item.itemPrice || 0,
                    price: item.itemPrice || 0,
                    addOnPrice: item.addOnPrice || 0,
                    totalPrice: item.totalPrice || 0,
                    variations: item.selectedVariation ? [{
                            name: 'Variation',
                            option: item.selectedVariation
                        }] : [],
                    addOns: item.addOns || [],
                    selectedVariation: item.selectedVariation,
                    notes: item.notes
                })));
            }
            const printData = {
                billId: bill.billNumber,
                tableNo: bill.tableId?.tableNumber || bill.tableId?.number || 'N/A',
                items: billItems,
                subtotal: bill.subtotal,
                tax: bill.tax,
                taxRate: settings?.taxRate ? settings.taxRate * 100 : 0,
                discount: bill.discount || 0,
                total: bill.total,
                paymentMethod: bill.paymentMethods?.[0]?.type || 'Cash',
                restaurantInfo: settings ? {
                    name: settings.restaurantName || 'Restaurant',
                    address: settings.address || '',
                    phone: settings.phone || ''
                } : undefined
            };
            console.log(`📤 Sending bill print request to server...`);
            const printResult = await (0, printServerService_1.printBillViaServer)(printData);
            if (printResult.success) {
                console.log(`✅ Bill ${bill.billNumber} printed via server. Job ID: ${printResult.jobId}`);
                return true;
            }
            else {
                console.error(`⚠️  Print server failed for bill ${bill.billNumber}: ${printResult.error}`);
                console.log(`📋 Falling back to local printer...`);
                // Fallback to local printing - create modified orders structure with filtered items
                let ordersForPrint;
                if (bill.isSplit && bill.splitGuests && bill.splitGuests.length > 0) {
                    // For split bills, create a single order with only assigned items
                    const guestData = bill.splitGuests[0];
                    ordersForPrint = [{
                            orderNumber: 'SPLIT',
                            items: guestData.items.map((splitItem) => {
                                // Find the actual item from orders to get full details
                                let itemDetails = null;
                                for (const order of bill.orders) {
                                    const foundItem = order.items[splitItem.orderItemIndex];
                                    if (foundItem) {
                                        itemDetails = foundItem;
                                        break;
                                    }
                                }
                                return {
                                    itemId: itemDetails?.itemId,
                                    name: itemDetails?.itemId?.name || splitItem.name || 'Unknown Item',
                                    quantity: splitItem.quantity,
                                    itemPrice: splitItem.itemPrice || 0,
                                    addOnPrice: splitItem.addOnPrice || 0,
                                    totalPrice: splitItem.totalPrice || 0,
                                    selectedVariation: itemDetails?.selectedVariation,
                                    addOns: itemDetails?.addOns || [],
                                    notes: itemDetails?.notes
                                };
                            })
                        }];
                }
                else {
                    // For regular bills, use all orders
                    ordersForPrint = bill.orders;
                }
                const billData = {
                    billNumber: bill.billNumber,
                    tableNumber: bill.tableId?.tableNumber || bill.tableId?.number || 'N/A',
                    createdAt: bill.createdAt,
                    orders: ordersForPrint,
                    subtotal: bill.subtotal,
                    tax: bill.tax,
                    discount: bill.discount || 0,
                    total: bill.total,
                    paymentMethods: bill.paymentMethods,
                    paymentType: bill.paymentMethods?.[0]?.type || 'Cash'
                };
                const success = await (0, printer_1.printBill)(billData, undefined, cutPaper);
                console.log(`✅ Bill ${bill.billNumber} printed via local fallback`);
                return success;
            }
        }
        else {
            // Use local printing directly
            console.log(`🖨️  Using local printer for bill ${bill.billNumber}`);
            // Create modified orders structure with filtered items
            let ordersForPrint;
            if (bill.isSplit && bill.splitGuests && bill.splitGuests.length > 0) {
                // For split bills, create a single order with only assigned items
                const guestData = bill.splitGuests[0];
                ordersForPrint = [{
                        orderNumber: 'SPLIT',
                        items: guestData.items.map((splitItem) => {
                            // Find the actual item from orders to get full details
                            let itemDetails = null;
                            for (const order of bill.orders) {
                                const foundItem = order.items[splitItem.orderItemIndex];
                                if (foundItem) {
                                    itemDetails = foundItem;
                                    break;
                                }
                            }
                            return {
                                itemId: itemDetails?.itemId,
                                name: itemDetails?.itemId?.name || splitItem.name || 'Unknown Item',
                                quantity: splitItem.quantity,
                                itemPrice: splitItem.itemPrice || 0,
                                addOnPrice: splitItem.addOnPrice || 0,
                                totalPrice: splitItem.totalPrice || 0,
                                selectedVariation: itemDetails?.selectedVariation,
                                addOns: itemDetails?.addOns || [],
                                notes: itemDetails?.notes
                            };
                        })
                    }];
            }
            else {
                // For regular bills, use all orders
                ordersForPrint = bill.orders;
            }
            const billData = {
                billNumber: bill.billNumber,
                tableNumber: bill.tableId?.tableNumber || bill.tableId?.number || 'N/A',
                createdAt: bill.createdAt,
                orders: ordersForPrint,
                subtotal: bill.subtotal,
                tax: bill.tax,
                discount: bill.discount || 0,
                total: bill.total,
                paymentMethods: bill.paymentMethods,
                paymentType: bill.paymentMethods?.[0]?.type || 'Cash'
            };
            const success = await (0, printer_1.printBill)(billData, undefined, cutPaper);
            if (success) {
                console.log(`✅ Bill ${bill.billNumber} printed locally`);
            }
            else {
                console.error(`❌ Failed to print bill ${bill.billNumber}`);
            }
            return success;
        }
    }
    catch (error) {
        console.error(`❌ Print error for bill ${bill.billNumber}:`, error);
        return false;
    }
};
exports.printBill = printBill;
const generateBillPrintContent = (bill) => {
    const now = new Date();
    const billTime = new Date(bill.createdAt);
    // For 12cm paper, we can use more characters (approximately 42 characters width)
    let content = `
RESTAURANT NAME
123 Main Street
City, State 12345
Tel: (555) 123-4567
==========================================
              CUSTOMER BILL
==========================================
Bill #: ${bill.billNumber}
Table: ${bill.tableId?.tableNumber || "N/A"}
Date: ${billTime.toLocaleDateString()}
Time: ${billTime.toLocaleTimeString()}
Cashier: ${bill.waiterId?.name || "N/A"}

ITEMS:
------------------------------------------`;
    if (bill.orders && bill.orders.length > 0) {
        bill.orders.forEach((order) => {
            content += `\nOrder #${order.orderNumber}`;
            if (order.waiterId?.name) {
                content += `\nWaiter: ${order.waiterId.name}`;
            }
            content += "\n";
            order.items.forEach((item) => {
                const itemName = item.itemId?.name || "Unknown Item";
                const qty = item.quantity;
                const price = item.totalPrice;
                // For 12cm paper, use more characters (42 instead of 32)
                const maxItemNameLength = 25; // Increased from 20
                const truncatedItemName = itemName.length > maxItemNameLength
                    ? itemName.substring(0, maxItemNameLength - 3) + "..."
                    : itemName;
                // Format: "Item Name x2              $12.50"
                const itemLine = `${truncatedItemName} x${qty}`;
                const priceStr = `रू ${price.toFixed(2)}`;
                const spaces = Math.max(1, 42 - itemLine.length - priceStr.length);
                content += `${itemLine}${" ".repeat(spaces)}${priceStr}\n`;
                if (item.selectedVariation) {
                    content += `   → ${item.selectedVariation}\n`;
                }
                if (item.addOns && item.addOns.length > 0) {
                    content += `   → + ${item.addOns.join(", ")}\n`;
                }
                if (item.notes) {
                    content += `   → Notes: ${item.notes}\n`;
                }
            });
            content += "\n";
        });
    }
    content += `------------------------------------------
Subtotal:                        रू ${bill.subtotal.toFixed(2)}
Tax (0%):                       रू ${bill.tax.toFixed(2)}`;
    if (bill.discount > 0) {
        content += `\nDiscount:                       -रू ${bill.discount.toFixed(2)}`;
    }
    content += `
==========================================
TOTAL:                          रू ${bill.total.toFixed(2)}
==========================================
Payment: ${bill.paymentType}

Thank you for dining with us!
Please come again!

Print Time: ${now.toLocaleTimeString()}
==========================================
`;
    return content;
};
