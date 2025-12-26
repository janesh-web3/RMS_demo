"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printSplitBill = exports.getSplitBillDetails = exports.updateSplitBillPayment = exports.getSplitBills = exports.createSplitBill = void 0;
const splitBillService_1 = require("../services/splitBillService");
const Bill_1 = __importDefault(require("../models/Bill"));
const Order_1 = __importDefault(require("../models/Order"));
const Table_1 = __importDefault(require("../models/Table"));
const socket_1 = require("../utils/socket");
const billController_1 = require("./billController");
/**
 * Create split bills
 * POST /bills/split
 */
const createSplitBill = async (req, res) => {
    try {
        const { tableId, discount = 0, selectedOrders, splitType, numberOfGuests, guestAssignments, customAmounts, manualStockEntries } = req.body;
        // Validate required fields
        if (!tableId) {
            return res.status(400).json({ message: 'Table ID is required' });
        }
        if (!splitType || !['equal', 'items', 'custom'].includes(splitType)) {
            return res.status(400).json({ message: 'Valid split type is required (equal, items, or custom)' });
        }
        let splitBills;
        switch (splitType) {
            case 'equal':
                if (!numberOfGuests || numberOfGuests < 2) {
                    return res.status(400).json({ message: 'Number of guests must be at least 2' });
                }
                splitBills = await splitBillService_1.SplitBillService.createEqualSplit({
                    tableId,
                    discount,
                    selectedOrders,
                    splitType,
                    numberOfGuests
                });
                break;
            case 'items':
                if (!guestAssignments || guestAssignments.length < 2) {
                    return res.status(400).json({ message: 'At least 2 guest assignments required' });
                }
                splitBills = await splitBillService_1.SplitBillService.createItemSplit({
                    tableId,
                    discount,
                    selectedOrders,
                    splitType,
                    guestAssignments
                });
                break;
            case 'custom':
                if (!customAmounts || customAmounts.length < 2) {
                    return res.status(400).json({ message: 'At least 2 custom amounts required' });
                }
                splitBills = await splitBillService_1.SplitBillService.createCustomSplit({
                    tableId,
                    discount,
                    selectedOrders,
                    splitType,
                    customAmounts
                });
                break;
            default:
                return res.status(400).json({ message: 'Invalid split type' });
        }
        // Print each split bill automatically (continuous printing without gaps)
        for (let i = 0; i < splitBills.length; i++) {
            const bill = splitBills[i];
            const isLastBill = i === splitBills.length - 1;
            try {
                console.log(`\n🖨️  Attempting to print split bill ${bill.billNumber} (${i + 1}/${splitBills.length})`);
                // Populate bill data for printing
                const populatedBill = await Bill_1.default.findById(bill._id)
                    .populate('tableId')
                    .populate({
                    path: 'orders',
                    populate: {
                        path: 'items.itemId'
                    }
                });
                if (populatedBill) {
                    // Only cut paper after the last bill in the series
                    await (0, billController_1.printBill)(populatedBill, isLastBill);
                    console.log(`✅ Split bill ${bill.billNumber} printed successfully${isLastBill ? ' (paper cut)' : ' (continuous)'}`);
                }
                else {
                    console.error(`❌ Could not find bill ${bill.billNumber} for printing`);
                }
            }
            catch (error) {
                console.error(`❌ Error printing split bill ${bill.billNumber}:`, error);
            }
        }
        // Mark orders as billed (since split bills have been created)
        // Get the parent bill to access order references
        const parentBill = await Bill_1.default.findOne({
            splitBills: { $in: splitBills.map(b => b._id) }
        });
        if (parentBill && parentBill.orders && parentBill.orders.length > 0) {
            // Mark all orders as billed
            await Order_1.default.updateMany({ _id: { $in: parentBill.orders } }, {
                $set: {
                    isBilled: true,
                    billedAt: new Date(),
                    billId: parentBill._id
                }
            });
            console.log(`✅ Marked ${parentBill.orders.length} orders as billed`);
            // Update table status to Available
            await Table_1.default.findByIdAndUpdate(tableId, {
                status: 'Available',
                currentOrder: null
            });
            console.log(`✅ Updated table ${tableId} status to Available`);
        }
        // Emit socket events for real-time updates
        const io = (0, socket_1.getIO)();
        splitBills.forEach(bill => {
            io.emit('bill-created', bill);
            io.emit('bill-updated', { type: 'created', bill });
            io.emit('billCreated', {
                billId: bill._id,
                billNumber: bill.billNumber,
            });
        });
        // Emit generic events for UI refresh
        io.emit('refreshBills');
        io.emit('refreshTables');
        io.emit('refreshOrders');
        res.status(201).json({
            message: 'Split bills created successfully',
            splitBills,
            count: splitBills.length
        });
    }
    catch (error) {
        console.error('Error creating split bill:', error);
        res.status(500).json({
            message: 'Error creating split bill',
            error: error.message
        });
    }
};
exports.createSplitBill = createSplitBill;
/**
 * Get all split bills for a parent bill
 * GET /bills/:parentBillId/splits
 */
const getSplitBills = async (req, res) => {
    try {
        const { parentBillId } = req.params;
        const splitBills = await splitBillService_1.SplitBillService.getSplitBills(parentBillId);
        res.status(200).json({
            message: 'Split bills retrieved successfully',
            splitBills,
            count: splitBills.length
        });
    }
    catch (error) {
        console.error('Error retrieving split bills:', error);
        res.status(500).json({
            message: 'Error retrieving split bills',
            error: error.message
        });
    }
};
exports.getSplitBills = getSplitBills;
/**
 * Update payment for a split bill
 * PUT /bills/split/:splitBillId/payment
 */
const updateSplitBillPayment = async (req, res) => {
    try {
        const { splitBillId } = req.params;
        const { paymentMethods, customerId, creditAmount } = req.body;
        // Validate payment methods
        if (!paymentMethods || !Array.isArray(paymentMethods) || paymentMethods.length === 0) {
            return res.status(400).json({ message: 'Payment methods are required' });
        }
        // Validate payment method structure
        for (const pm of paymentMethods) {
            if (!pm.type || !pm.amount || pm.amount <= 0) {
                return res.status(400).json({
                    message: 'Each payment method must have a type and positive amount'
                });
            }
        }
        // Check for credit payment
        const hasCreditPayment = paymentMethods.some((pm) => pm.type === 'Credit');
        if (hasCreditPayment && !customerId) {
            return res.status(400).json({
                message: 'Customer ID is required for credit payment'
            });
        }
        const updatedBill = await splitBillService_1.SplitBillService.updateSplitBillPayment(splitBillId, paymentMethods, customerId, creditAmount);
        // Emit socket event
        const io = (0, socket_1.getIO)();
        io.emit('bill-updated', { type: 'payment_updated', bill: updatedBill });
        res.status(200).json({
            message: 'Split bill payment updated successfully',
            bill: updatedBill
        });
    }
    catch (error) {
        console.error('Error updating split bill payment:', error);
        res.status(500).json({
            message: 'Error updating split bill payment',
            error: error.message
        });
    }
};
exports.updateSplitBillPayment = updateSplitBillPayment;
/**
 * Get split bill details
 * GET /bills/split/:splitBillId
 */
const getSplitBillDetails = async (req, res) => {
    try {
        const { splitBillId } = req.params;
        const bill = await Bill_1.default.findById(splitBillId)
            .populate('tableId')
            .populate({
            path: 'orders',
            populate: {
                path: 'items.itemId'
            }
        })
            .populate('parentBillId')
            .populate('splitBills')
            .populate('customerId');
        if (!bill) {
            return res.status(404).json({ message: 'Split bill not found' });
        }
        res.status(200).json({
            message: 'Split bill details retrieved successfully',
            bill
        });
    }
    catch (error) {
        console.error('Error retrieving split bill details:', error);
        res.status(500).json({
            message: 'Error retrieving split bill details',
            error: error.message
        });
    }
};
exports.getSplitBillDetails = getSplitBillDetails;
/**
 * Print individual split bill
 * POST /bills/split/:splitBillId/print
 */
const printSplitBill = async (req, res) => {
    try {
        const { splitBillId } = req.params;
        const bill = await Bill_1.default.findById(splitBillId)
            .populate('tableId')
            .populate({
            path: 'orders',
            populate: {
                path: 'items.itemId'
            }
        });
        if (!bill) {
            return res.status(404).json({ message: 'Split bill not found' });
        }
        // Increment print count
        bill.printCount += 1;
        await bill.save();
        // Here you can integrate with your print service
        // For now, just return the bill data formatted for printing
        res.status(200).json({
            message: 'Split bill print initiated',
            bill,
            printCount: bill.printCount
        });
    }
    catch (error) {
        console.error('Error printing split bill:', error);
        res.status(500).json({
            message: 'Error printing split bill',
            error: error.message
        });
    }
};
exports.printSplitBill = printSplitBill;
