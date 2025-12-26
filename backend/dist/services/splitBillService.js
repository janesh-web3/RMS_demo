"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SplitBillService = void 0;
const Bill_1 = __importDefault(require("../models/Bill"));
const Order_1 = __importDefault(require("../models/Order"));
const Table_1 = __importDefault(require("../models/Table"));
const RestaurantSettings_1 = __importDefault(require("../models/RestaurantSettings"));
const mongoose_1 = __importDefault(require("mongoose"));
class SplitBillService {
    /**
     * Generate bill preview data (used for both regular and split bills)
     */
    static async getBillPreviewData(tableId, discount = 0, selectedOrders) {
        const table = await Table_1.default.findById(tableId);
        if (!table) {
            throw new Error('Table not found');
        }
        let orders;
        if (selectedOrders && selectedOrders.length > 0) {
            orders = await Order_1.default.find({
                _id: { $in: selectedOrders },
                tableId,
                status: 'Served',
                isBilled: false,
            }).populate('items.itemId');
        }
        else {
            orders = await Order_1.default.find({
                tableId,
                status: 'Served',
                isBilled: false,
            }).populate('items.itemId');
        }
        if (orders.length === 0) {
            throw new Error('No served orders found for this table');
        }
        // Calculate subtotal from all active items
        let subtotal = 0;
        orders.forEach(order => {
            order.items.forEach((item) => {
                if (item.status === 'active') {
                    subtotal += item.totalPrice;
                }
            });
        });
        // Get tax rate from settings
        const settings = await RestaurantSettings_1.default.findOne();
        const taxRate = settings?.taxRate || 0;
        const tax = subtotal * (taxRate / 100);
        const total = subtotal + tax - discount;
        return {
            orders,
            subtotal,
            tax,
            taxRate,
            discount,
            total
        };
    }
    /**
     * Generate bill number
     */
    static async generateBillNumber() {
        const lastBill = await Bill_1.default.findOne().sort({ createdAt: -1 });
        if (!lastBill) {
            return 'BILL-00001';
        }
        const lastNumber = parseInt(lastBill.billNumber.split('-')[1]);
        return `BILL-${String(lastNumber + 1).padStart(5, '0')}`;
    }
    /**
     * Create split bills based on equal division
     */
    static async createEqualSplit(request) {
        const { tableId, discount = 0, selectedOrders, numberOfGuests } = request;
        if (!numberOfGuests || numberOfGuests < 2) {
            throw new Error('Number of guests must be at least 2 for split billing');
        }
        // Get bill preview data
        const previewData = await this.getBillPreviewData(tableId, discount, selectedOrders);
        const { orders, subtotal, tax, taxRate } = previewData;
        // Calculate per-guest amounts
        const perGuestSubtotal = subtotal / numberOfGuests;
        const perGuestTax = tax / numberOfGuests;
        const perGuestDiscount = discount / numberOfGuests;
        const perGuestTotal = (subtotal + tax - discount) / numberOfGuests;
        // Collect all items from all orders
        const allItems = [];
        orders.forEach((order, orderIndex) => {
            order.items.forEach((item, itemIndex) => {
                if (item.status === 'active') {
                    allItems.push({
                        orderId: order._id,
                        orderItemIndex: itemIndex,
                        item
                    });
                }
            });
        });
        // Distribute items equally among guests
        const guestsData = [];
        for (let i = 0; i < numberOfGuests; i++) {
            const guestItems = [];
            // Assign items in round-robin fashion
            allItems.forEach((itemData, index) => {
                if (index % numberOfGuests === i) {
                    guestItems.push({
                        itemId: itemData.item.itemId._id,
                        orderItemIndex: itemData.orderItemIndex,
                        quantity: itemData.item.quantity,
                        itemPrice: itemData.item.itemPrice,
                        addOnPrice: itemData.item.addOnPrice || 0,
                        totalPrice: itemData.item.totalPrice
                    });
                }
            });
            guestsData.push({
                guestName: `Guest ${i + 1}`,
                items: guestItems,
                subtotal: perGuestSubtotal,
                tax: perGuestTax,
                discount: perGuestDiscount,
                total: perGuestTotal
            });
        }
        // Create parent bill (for reference)
        const parentBillNumber = await this.generateBillNumber();
        const parentBill = await Bill_1.default.create({
            tableId,
            orders: orders.map(o => o._id),
            subtotal,
            tax,
            discount,
            total: subtotal + tax - discount,
            paymentMethods: [],
            billNumber: parentBillNumber,
            isSplit: true,
            splitType: 'equal',
            splitGuests: guestsData,
            paymentStatus: 'unpaid',
            paidAmount: 0
        });
        // Create individual bills for each guest
        const splitBills = [];
        for (let i = 0; i < numberOfGuests; i++) {
            const guestBillNumber = await this.generateBillNumber();
            const splitBill = await Bill_1.default.create({
                tableId,
                orders: orders.map(o => o._id),
                subtotal: perGuestSubtotal,
                tax: perGuestTax,
                discount: perGuestDiscount,
                total: perGuestTotal,
                paymentMethods: [],
                billNumber: guestBillNumber,
                isSplit: true,
                splitType: 'equal',
                parentBillId: parentBill._id,
                guestName: `Guest ${i + 1}`,
                splitGuests: [guestsData[i]],
                paymentStatus: 'unpaid',
                paidAmount: 0
            });
            splitBills.push(splitBill);
        }
        // Update parent bill with split bill references
        parentBill.splitBills = splitBills.map(b => b._id);
        await parentBill.save();
        return splitBills;
    }
    /**
     * Create split bills based on item assignments
     */
    static async createItemSplit(request) {
        const { tableId, discount = 0, selectedOrders, guestAssignments } = request;
        if (!guestAssignments || guestAssignments.length < 2) {
            throw new Error('At least 2 guests required for item-based split');
        }
        // Get bill preview data
        const previewData = await this.getBillPreviewData(tableId, discount, selectedOrders);
        const { orders, subtotal, tax, taxRate } = previewData;
        // Build item lookup
        const itemLookup = new Map();
        orders.forEach((order) => {
            order.items.forEach((item, itemIndex) => {
                if (item.status === 'active') {
                    itemLookup.set(itemIndex, {
                        orderId: order._id,
                        item
                    });
                }
            });
        });
        // Calculate each guest's totals
        const guestsData = [];
        let totalAssignedAmount = 0;
        for (const assignment of guestAssignments) {
            const guestItems = [];
            let guestSubtotal = 0;
            for (const itemAssignment of assignment.items) {
                const itemData = itemLookup.get(itemAssignment.orderItemIndex);
                if (!itemData)
                    continue;
                const item = itemData.item;
                const assignedQty = itemAssignment.quantity;
                const unitPrice = item.itemPrice;
                const unitAddOnPrice = item.addOnPrice || 0;
                const itemTotal = (unitPrice + unitAddOnPrice) * assignedQty;
                guestItems.push({
                    itemId: item.itemId._id,
                    orderItemIndex: itemAssignment.orderItemIndex,
                    quantity: assignedQty,
                    itemPrice: unitPrice,
                    addOnPrice: unitAddOnPrice,
                    totalPrice: itemTotal
                });
                guestSubtotal += itemTotal;
            }
            const guestTax = guestSubtotal * (taxRate / 100);
            const guestDiscount = (guestSubtotal / subtotal) * discount; // Proportional discount
            const guestTotal = guestSubtotal + guestTax - guestDiscount;
            totalAssignedAmount += guestTotal;
            guestsData.push({
                guestName: assignment.guestName || `Guest ${guestsData.length + 1}`,
                items: guestItems,
                subtotal: guestSubtotal,
                tax: guestTax,
                discount: guestDiscount,
                total: guestTotal
            });
        }
        // Create parent bill
        const parentBillNumber = await this.generateBillNumber();
        const parentBill = await Bill_1.default.create({
            tableId,
            orders: orders.map(o => o._id),
            subtotal,
            tax,
            discount,
            total: subtotal + tax - discount,
            paymentMethods: [],
            billNumber: parentBillNumber,
            isSplit: true,
            splitType: 'items',
            splitGuests: guestsData,
            paymentStatus: 'unpaid',
            paidAmount: 0
        });
        // Create individual bills for each guest
        const splitBills = [];
        for (let i = 0; i < guestsData.length; i++) {
            const guestData = guestsData[i];
            const guestBillNumber = await this.generateBillNumber();
            const splitBill = await Bill_1.default.create({
                tableId,
                orders: orders.map(o => o._id),
                subtotal: guestData.subtotal,
                tax: guestData.tax,
                discount: guestData.discount,
                total: guestData.total,
                paymentMethods: [],
                billNumber: guestBillNumber,
                isSplit: true,
                splitType: 'items',
                parentBillId: parentBill._id,
                guestName: guestData.guestName,
                splitGuests: [guestData],
                paymentStatus: 'unpaid',
                paidAmount: 0
            });
            splitBills.push(splitBill);
        }
        // Update parent bill with split bill references
        parentBill.splitBills = splitBills.map(b => b._id);
        await parentBill.save();
        return splitBills;
    }
    /**
     * Create split bills based on custom amounts
     */
    static async createCustomSplit(request) {
        const { tableId, discount = 0, selectedOrders, customAmounts } = request;
        if (!customAmounts || customAmounts.length < 2) {
            throw new Error('At least 2 custom amounts required for custom split');
        }
        // Get bill preview data
        const previewData = await this.getBillPreviewData(tableId, discount, selectedOrders);
        const { orders, subtotal, tax } = previewData;
        const totalBillAmount = subtotal + tax - discount;
        // Validate custom amounts sum equals total
        const customTotal = customAmounts.reduce((sum, amt) => sum + amt.amount, 0);
        if (Math.abs(customTotal - totalBillAmount) > 0.01) {
            throw new Error(`Custom amounts total (${customTotal}) must equal bill total (${totalBillAmount})`);
        }
        // Create guests data
        const guestsData = customAmounts.map((amt, index) => {
            // Calculate proportional breakdown
            const proportion = amt.amount / totalBillAmount;
            const guestSubtotal = subtotal * proportion;
            const guestTax = tax * proportion;
            const guestDiscount = discount * proportion;
            return {
                guestName: amt.guestName || `Guest ${index + 1}`,
                items: [], // No specific item assignment for custom split
                subtotal: guestSubtotal,
                tax: guestTax,
                discount: guestDiscount,
                total: amt.amount
            };
        });
        // Create parent bill
        const parentBillNumber = await this.generateBillNumber();
        const parentBill = await Bill_1.default.create({
            tableId,
            orders: orders.map(o => o._id),
            subtotal,
            tax,
            discount,
            total: totalBillAmount,
            paymentMethods: [],
            billNumber: parentBillNumber,
            isSplit: true,
            splitType: 'custom',
            splitGuests: guestsData,
            paymentStatus: 'unpaid',
            paidAmount: 0
        });
        // Create individual bills for each guest
        const splitBills = [];
        for (let i = 0; i < guestsData.length; i++) {
            const guestData = guestsData[i];
            const guestBillNumber = await this.generateBillNumber();
            const splitBill = await Bill_1.default.create({
                tableId,
                orders: orders.map(o => o._id),
                subtotal: guestData.subtotal,
                tax: guestData.tax,
                discount: guestData.discount,
                total: guestData.total,
                paymentMethods: [],
                billNumber: guestBillNumber,
                isSplit: true,
                splitType: 'custom',
                parentBillId: parentBill._id,
                guestName: guestData.guestName,
                splitGuests: [guestData],
                paymentStatus: 'unpaid',
                paidAmount: 0
            });
            splitBills.push(splitBill);
        }
        // Update parent bill with split bill references
        parentBill.splitBills = splitBills.map(b => b._id);
        await parentBill.save();
        return splitBills;
    }
    /**
     * Update payment for a split bill
     */
    static async updateSplitBillPayment(splitBillId, paymentMethods, customerId, creditAmount) {
        const splitBill = await Bill_1.default.findById(splitBillId);
        if (!splitBill) {
            throw new Error('Split bill not found');
        }
        if (!splitBill.isSplit || splitBill.parentBillId) {
            // This is an individual split bill
            const paidTotal = paymentMethods.reduce((sum, pm) => sum + pm.amount, 0);
            // Validate payment amount
            if (Math.abs(paidTotal - splitBill.total) > 0.01) {
                throw new Error('Payment amount must match bill total');
            }
            splitBill.paymentMethods = paymentMethods;
            splitBill.paymentStatus = 'paid';
            splitBill.paidAmount = paidTotal;
            if (customerId) {
                splitBill.customerId = new mongoose_1.default.Types.ObjectId(customerId);
            }
            if (creditAmount) {
                splitBill.creditAmount = creditAmount;
            }
            await splitBill.save();
            // Check if all splits are paid, update parent
            if (splitBill.parentBillId) {
                await this.updateParentBillStatus(splitBill.parentBillId.toString());
            }
            return splitBill;
        }
        else {
            throw new Error('Cannot directly pay parent bill. Pay individual split bills.');
        }
    }
    /**
     * Update parent bill payment status based on child splits
     */
    static async updateParentBillStatus(parentBillId) {
        const parentBill = await Bill_1.default.findById(parentBillId).populate('splitBills');
        if (!parentBill || !parentBill.splitBills)
            return;
        const splits = await Bill_1.default.find({ _id: { $in: parentBill.splitBills } });
        const allPaid = splits.every(s => s.paymentStatus === 'paid');
        const nonePaid = splits.every(s => s.paymentStatus === 'unpaid');
        if (allPaid) {
            parentBill.paymentStatus = 'paid';
            parentBill.paidAmount = parentBill.total;
            // Mark orders as billed
            await Order_1.default.updateMany({ _id: { $in: parentBill.orders } }, {
                $set: {
                    isBilled: true,
                    billedAt: new Date(),
                    billId: parentBill._id
                }
            });
            // Update table status to Available
            await Table_1.default.findByIdAndUpdate(parentBill.tableId, {
                status: 'Available',
                currentOrder: null
            });
        }
        else if (nonePaid) {
            parentBill.paymentStatus = 'unpaid';
            parentBill.paidAmount = 0;
        }
        else {
            parentBill.paymentStatus = 'partial';
            parentBill.paidAmount = splits
                .filter(s => s.paymentStatus === 'paid')
                .reduce((sum, s) => sum + s.paidAmount, 0);
        }
        await parentBill.save();
    }
    /**
     * Get all split bills for a parent bill
     */
    static async getSplitBills(parentBillId) {
        const parentBill = await Bill_1.default.findById(parentBillId);
        if (!parentBill || !parentBill.isSplit) {
            throw new Error('Parent bill not found or not a split bill');
        }
        const splits = await Bill_1.default.find({
            parentBillId: parentBill._id
        }).populate('orders');
        return splits;
    }
}
exports.SplitBillService = SplitBillService;
