"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportReport = exports.getSalesReport = exports.getCreditAnalytics = exports.getMonthlyReport = exports.getPaymentAnalytics = exports.getOrderHistory = exports.getDailySalesReport = exports.getSalesRangeReport = void 0;
const Bill_1 = __importDefault(require("../models/Bill"));
const Order_1 = __importDefault(require("../models/Order"));
const Customer_1 = __importDefault(require("../models/Customer"));
const Expense_1 = __importDefault(require("../models/Expense"));
const getSalesRangeReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const startDateTime = startDate ? new Date(startDate) : new Date();
        startDateTime.setHours(0, 0, 0, 0);
        const endDateTime = endDate ? new Date(endDate) : new Date();
        endDateTime.setHours(23, 59, 59, 999);
        const bills = await Bill_1.default.find({
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        }).populate({
            path: "orders",
            populate: {
                path: "items.itemId",
            },
        });
        let totalSales = 0;
        let totalOrders = 0;
        let totalTax = 0;
        let totalDiscount = 0;
        const paymentBreakdown = {
            Cash: 0,
            "E-sewa": 0,
            Khalti: 0,
            "Bank Transfer": 0,
            Credit: 0,
        };
        const itemSales = {};
        // Daily breakdown for range reports
        const dailyBreakdown = {};
        for (const bill of bills) {
            const billDate = bill.createdAt.toISOString().split('T')[0];
            // Initialize daily data if not exists
            if (!dailyBreakdown[billDate]) {
                dailyBreakdown[billDate] = { sales: 0, orders: 0, bills: 0 };
            }
            totalSales += bill.total;
            totalTax += bill.tax;
            totalDiscount += bill.discount;
            totalOrders += bill.orders.length;
            // Update daily breakdown
            dailyBreakdown[billDate].sales += bill.total;
            dailyBreakdown[billDate].orders += bill.orders.length;
            dailyBreakdown[billDate].bills += 1;
            // Handle multiple payment methods
            for (const paymentMethod of bill.paymentMethods) {
                paymentBreakdown[paymentMethod.type] +=
                    paymentMethod.amount;
            }
            for (const order of bill.orders) {
                for (const item of order.items) {
                    // Skip cancelled items
                    if (item.status === 'cancelled') {
                        continue;
                    }
                    const itemId = item.itemId._id.toString();
                    const itemName = item.itemId.name;
                    // Create a unique key that includes variations and add-ons for more detailed tracking
                    let itemKey = itemId;
                    let displayName = itemName;
                    if (item.selectedVariation) {
                        itemKey += `_${item.selectedVariation}`;
                        displayName += ` (${item.selectedVariation})`;
                    }
                    if (item.addOns && item.addOns.length > 0) {
                        const addOnsStr = item.addOns.join(", ");
                        itemKey += `_${addOnsStr}`;
                        displayName += ` + ${addOnsStr}`;
                    }
                    if (!itemSales[itemKey]) {
                        itemSales[itemKey] = {
                            name: displayName,
                            quantity: 0,
                            revenue: 0,
                            variations: item.selectedVariation
                                ? [item.selectedVariation]
                                : [],
                            addOns: item.addOns || [],
                        };
                    }
                    itemSales[itemKey].quantity += item.quantity;
                    itemSales[itemKey].revenue += item.totalPrice;
                }
            }
        }
        // Add customer credit payments for the same date range
        const customers = await Customer_1.default.find({
            isActive: true,
            creditTransactions: { $exists: true, $not: { $size: 0 } }
        });
        // Process customer credit transactions for the date range
        for (const customer of customers) {
            for (const transaction of customer.creditTransactions) {
                const transactionDate = new Date(transaction.createdAt);
                // Check if transaction is within the date range
                if (transactionDate >= startDateTime && transactionDate <= endDateTime) {
                    if (transaction.type === 'Payment' && transaction.paymentMethod) {
                        const type = transaction.paymentMethod;
                        if (paymentBreakdown[type] !== undefined) {
                            paymentBreakdown[type] += transaction.amount;
                            paymentBreakdown.Credit -= transaction.amount;
                        }
                    }
                }
            }
        }
        const topSellingItems = Object.values(itemSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        const topRevenueItems = Object.values(itemSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        // Convert daily breakdown to array format
        const dailyBreakdownArray = Object.entries(dailyBreakdown)
            .map(([date, data]) => ({
            date,
            ...data
        }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        res.json({
            startDate: startDateTime.toISOString().split("T")[0],
            endDate: endDateTime.toISOString().split("T")[0],
            totalSales,
            totalOrders,
            totalBills: bills.length,
            totalTax,
            totalDiscount,
            paymentBreakdown,
            topSellingItems,
            topRevenueItems,
            averageBillValue: bills.length > 0 ? totalSales / bills.length : 0,
            dailyBreakdown: dailyBreakdownArray,
        });
    }
    catch (error) {
        console.error("Get sales range report error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getSalesRangeReport = getSalesRangeReport;
const getDailySalesReport = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        const bills = await Bill_1.default.find({
            createdAt: {
                $gte: startOfDay,
                $lte: endOfDay,
            },
        }).populate({
            path: "orders",
            populate: {
                path: "items.itemId",
            },
        });
        let totalSales = 0;
        let totalOrders = 0;
        let totalTax = 0;
        let totalDiscount = 0;
        const paymentBreakdown = {
            Cash: 0,
            "E-sewa": 0,
            Khalti: 0,
            "Bank Transfer": 0,
            Credit: 0,
        };
        const itemSales = {};
        for (const bill of bills) {
            totalSales += bill.total;
            totalTax += bill.tax;
            totalDiscount += bill.discount;
            totalOrders += bill.orders.length;
            // Handle multiple payment methods
            for (const paymentMethod of bill.paymentMethods) {
                paymentBreakdown[paymentMethod.type] +=
                    paymentMethod.amount;
            }
            for (const order of bill.orders) {
                for (const item of order.items) {
                    // Skip cancelled items
                    if (item.status === 'cancelled') {
                        continue;
                    }
                    const itemId = item.itemId._id.toString();
                    const itemName = item.itemId.name;
                    // Create a unique key that includes variations and add-ons for more detailed tracking
                    let itemKey = itemId;
                    let displayName = itemName;
                    if (item.selectedVariation) {
                        itemKey += `_${item.selectedVariation}`;
                        displayName += ` (${item.selectedVariation})`;
                    }
                    if (item.addOns && item.addOns.length > 0) {
                        const addOnsStr = item.addOns.join(", ");
                        itemKey += `_${addOnsStr}`;
                        displayName += ` + ${addOnsStr}`;
                    }
                    if (!itemSales[itemKey]) {
                        itemSales[itemKey] = {
                            name: displayName,
                            quantity: 0,
                            revenue: 0,
                            variations: item.selectedVariation
                                ? [item.selectedVariation]
                                : [],
                            addOns: item.addOns || [],
                        };
                    }
                    itemSales[itemKey].quantity += item.quantity;
                    itemSales[itemKey].revenue += item.totalPrice;
                }
            }
        }
        // Add customer credit payments for the same day
        const customers = await Customer_1.default.find({
            isActive: true,
            creditTransactions: { $exists: true, $not: { $size: 0 } }
        });
        // Process customer credit transactions for the target date
        for (const customer of customers) {
            for (const transaction of customer.creditTransactions) {
                const transactionDate = new Date(transaction.createdAt);
                // Check if transaction is on the target date
                if (transactionDate >= startOfDay && transactionDate <= endOfDay) {
                    if (transaction.type === 'Payment' && transaction.paymentMethod) {
                        // Only process payment transactions - credit transactions are already counted from bills
                        // Add payment to the specific payment method and reduce from Credit
                        const type = transaction.paymentMethod;
                        if (paymentBreakdown[type] !== undefined) {
                            paymentBreakdown[type] += transaction.amount;
                            // Reduce Credit amount since customer paid off credit
                            paymentBreakdown.Credit -= transaction.amount;
                        }
                    }
                    // Note: We don't add Credit transactions here because they're already counted
                    // from bills with Credit payment method to avoid double counting
                }
            }
        }
        const topSellingItems = Object.values(itemSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        const topRevenueItems = Object.values(itemSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        res.json({
            date: targetDate.toISOString().split("T")[0],
            totalSales,
            totalOrders,
            totalBills: bills.length,
            totalTax,
            totalDiscount,
            paymentBreakdown,
            topSellingItems,
            topRevenueItems,
            averageBillValue: bills.length > 0 ? totalSales / bills.length : 0,
        });
    }
    catch (error) {
        console.error("Get daily sales report error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getDailySalesReport = getDailySalesReport;
const getOrderHistory = async (req, res) => {
    try {
        const { startDate, endDate, tableId, status, limit = 50, offset = 0, includeBilled = false, } = req.query;
        let filter = {};
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate)
                filter.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = endOfDay;
            }
        }
        if (tableId)
            filter.tableId = tableId;
        if (status)
            filter.status = status;
        // Filter based on billed status
        if (includeBilled === "true") {
            filter.isBilled = true;
        }
        else if (includeBilled === "false") {
            filter.isBilled = false;
        }
        // Get total count for pagination
        const totalCount = await Order_1.default.countDocuments(filter);
        const orders = await Order_1.default.find(filter)
            .populate("tableId", "tableNumber")
            .populate("items.itemId", "name price")
            .populate("waiterId", "name")
            .populate("billId")
            .sort({ createdAt: -1 })
            .skip(parseInt(offset))
            .limit(parseInt(limit));
        res.json({
            orders,
            totalCount,
            currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            hasNextPage: parseInt(offset) + parseInt(limit) < totalCount,
            hasPrevPage: parseInt(offset) > 0
        });
    }
    catch (error) {
        console.error("Get order history error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getOrderHistory = getOrderHistory;
const getPaymentAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let filter = {};
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = endOfDay;
            }
        }
        const bills = await Bill_1.default.find(filter);
        const paymentAnalytics = {
            Cash: { count: 0, total: 0 },
            "E-sewa": { count: 0, total: 0 },
            Khalti: { count: 0, total: 0 },
            "Bank Transfer": { count: 0, total: 0 },
            Credit: { count: 0, total: 0 },
        };
        let totalBills = 0;
        let totalRevenue = 0;
        let mixedPaymentBills = 0;
        // Process bill payments
        for (const bill of bills) {
            totalBills++;
            totalRevenue += bill.total;
            if (bill.paymentMethods.length > 1) {
                mixedPaymentBills++;
            }
            for (const paymentMethod of bill.paymentMethods) {
                const type = paymentMethod.type;
                paymentAnalytics[type].count++;
                paymentAnalytics[type].total += paymentMethod.amount;
            }
        }
        // Get customer credit payments in the same date range
        const customers = await Customer_1.default.find({
            isActive: true,
            creditTransactions: { $exists: true, $not: { $size: 0 } }
        });
        // Process customer credit transactions
        for (const customer of customers) {
            for (const transaction of customer.creditTransactions) {
                const transactionDate = new Date(transaction.createdAt);
                // Check if transaction is within date range
                let includeTransaction = true;
                if (startDate && transactionDate < new Date(startDate)) {
                    includeTransaction = false;
                }
                if (endDate) {
                    const endOfDay = new Date(endDate);
                    endOfDay.setHours(23, 59, 59, 999);
                    if (transactionDate > endOfDay) {
                        includeTransaction = false;
                    }
                }
                if (includeTransaction) {
                    if (transaction.type === 'Payment' && transaction.paymentMethod) {
                        // Only process payment transactions - credit transactions are already counted from bills
                        // Add payment to the specific payment method and reduce from Credit
                        const type = transaction.paymentMethod;
                        if (paymentAnalytics[type]) {
                            paymentAnalytics[type].count++;
                            paymentAnalytics[type].total += transaction.amount;
                            // Reduce Credit amount since customer paid off credit
                            paymentAnalytics.Credit.total -= transaction.amount;
                            // Note: Customer credit payments don't count towards totalRevenue as they're not new sales
                        }
                    }
                    // Note: We don't add Credit transactions here because they're already counted
                    // from bills with Credit payment method to avoid double counting
                }
            }
        }
        res.json({
            totalBills,
            totalRevenue,
            mixedPaymentBills,
            paymentBreakdown: paymentAnalytics,
            mixedPaymentPercentage: totalBills > 0 ? (mixedPaymentBills / totalBills) * 100 : 0,
        });
    }
    catch (error) {
        console.error("Get payment analytics error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getPaymentAnalytics = getPaymentAnalytics;
const getMonthlyReport = async (req, res) => {
    try {
        const { month, year } = req.query;
        const targetDate = new Date();
        if (year)
            targetDate.setFullYear(parseInt(year));
        if (month)
            targetDate.setMonth(parseInt(month) - 1);
        const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
        const bills = await Bill_1.default.find({
            createdAt: {
                $gte: startOfMonth,
                $lte: endOfMonth,
            },
        }).populate({
            path: "orders",
            populate: {
                path: "items.itemId",
            },
        });
        // Daily breakdown
        const dailySales = {};
        const daysInMonth = endOfMonth.getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            dailySales[i.toString()] = 0;
        }
        let totalSales = 0;
        let totalOrders = 0;
        for (const bill of bills) {
            const day = bill.createdAt.getDate().toString();
            dailySales[day] += bill.total;
            totalSales += bill.total;
            totalOrders += bill.orders.length;
        }
        res.json({
            month: targetDate.getMonth() + 1,
            year: targetDate.getFullYear(),
            totalSales,
            totalOrders,
            totalBills: bills.length,
            dailySales,
            averageDailySales: totalSales / daysInMonth,
        });
    }
    catch (error) {
        console.error("Get monthly report error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getMonthlyReport = getMonthlyReport;
const getCreditAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let filter = {};
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = endOfDay;
            }
        }
        // Get credit-related bills
        const creditBills = await Bill_1.default.find({
            ...filter,
            creditAmount: { $gt: 0 }
        }).populate('customerId', 'name phone email');
        // Get all customers with credit
        const customersWithCredit = await Customer_1.default.find({
            creditBalance: { $gt: 0 },
            isActive: true
        }).sort({ creditBalance: -1 });
        // Calculate credit statistics
        let totalCreditGiven = 0;
        let totalCreditOutstanding = 0;
        let totalCreditPaid = 0;
        let creditBillsCount = 0;
        for (const bill of creditBills) {
            totalCreditGiven += bill.creditAmount || 0;
            creditBillsCount++;
        }
        for (const customer of customersWithCredit) {
            totalCreditOutstanding += customer.creditBalance;
            totalCreditPaid += customer.totalCreditPaid;
        }
        // Get recent credit transactions
        const recentCreditTransactions = [];
        for (const customer of customersWithCredit.slice(0, 10)) {
            const recentTransactions = customer.creditTransactions
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map(transaction => ({
                ...transaction,
                customerName: customer.name,
                customerId: customer._id
            }));
            recentCreditTransactions.push(...recentTransactions);
        }
        // Sort all recent transactions by date
        recentCreditTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Top customers by credit balance
        const topCreditCustomers = customersWithCredit.slice(0, 10).map(customer => ({
            _id: customer._id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            creditBalance: customer.creditBalance,
            totalCreditGiven: customer.totalCreditGiven,
            totalCreditPaid: customer.totalCreditPaid
        }));
        res.json({
            totalCreditGiven,
            totalCreditOutstanding,
            totalCreditPaid,
            creditBillsCount,
            customersWithCreditCount: customersWithCredit.length,
            averageCreditPerCustomer: customersWithCredit.length > 0
                ? totalCreditOutstanding / customersWithCredit.length
                : 0,
            creditRecoveryRate: totalCreditGiven > 0
                ? (totalCreditPaid / (totalCreditGiven + totalCreditPaid)) * 100
                : 0,
            topCreditCustomers,
            recentCreditTransactions: recentCreditTransactions.slice(0, 20)
        });
    }
    catch (error) {
        console.error("Get credit analytics error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getCreditAnalytics = getCreditAnalytics;
const getSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, period = 'daily' } = req.query;
        let dateFilter = {};
        let groupBy = {};
        // Set up date filter
        if (startDate)
            dateFilter.$gte = new Date(startDate);
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            dateFilter.$lte = endOfDay;
        }
        // Set up grouping based on period
        switch (period) {
            case 'daily':
                groupBy = {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" }
                };
                break;
            case 'weekly':
                groupBy = {
                    year: { $year: "$createdAt" },
                    week: { $week: "$createdAt" }
                };
                break;
            case 'monthly':
                groupBy = {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" }
                };
                break;
            case 'yearly':
                groupBy = {
                    year: { $year: "$createdAt" }
                };
                break;
        }
        // Get aggregated sales data
        const salesTrends = await Bill_1.default.aggregate([
            { $match: { createdAt: dateFilter } },
            {
                $group: {
                    _id: groupBy,
                    revenue: { $sum: "$total" },
                    orders: { $sum: { $size: "$orders" } },
                    count: { $sum: 1 }
                }
            },
            {
                $addFields: {
                    date: {
                        $dateFromParts: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: "$_id.day"
                        }
                    },
                    period: {
                        $switch: {
                            branches: [
                                {
                                    case: { $eq: [period, 'daily'] },
                                    then: {
                                        $dateToString: {
                                            format: "%Y-%m-%d",
                                            date: {
                                                $dateFromParts: {
                                                    year: "$_id.year",
                                                    month: "$_id.month",
                                                    day: "$_id.day"
                                                }
                                            }
                                        }
                                    }
                                },
                                {
                                    case: { $eq: [period, 'monthly'] },
                                    then: {
                                        $dateToString: {
                                            format: "%Y-%m",
                                            date: {
                                                $dateFromParts: {
                                                    year: "$_id.year",
                                                    month: "$_id.month",
                                                    day: 1
                                                }
                                            }
                                        }
                                    }
                                },
                                {
                                    case: { $eq: [period, 'yearly'] },
                                    then: { $toString: "$_id.year" }
                                }
                            ],
                            default: {
                                $dateToString: {
                                    format: "%Y-%m-%d",
                                    date: {
                                        $dateFromParts: {
                                            year: "$_id.year",
                                            month: "$_id.month",
                                            day: "$_id.day"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            { $sort: { date: 1 } },
            {
                $project: {
                    _id: 0,
                    period: 1,
                    revenue: 1,
                    orders: 1,
                    avgOrderValue: { $divide: ["$revenue", "$orders"] }
                }
            }
        ]);
        // Get summary data
        const summary = await Bill_1.default.aggregate([
            { $match: { createdAt: dateFilter } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$total" },
                    totalOrders: { $sum: { $size: "$orders" } },
                    totalBills: { $sum: 1 }
                }
            },
            {
                $addFields: {
                    avgOrderValue: { $divide: ["$totalRevenue", "$totalOrders"] }
                }
            }
        ]);
        // Get top selling items
        const topItems = await Bill_1.default.aggregate([
            { $match: { createdAt: dateFilter } },
            { $unwind: "$orders" },
            {
                $lookup: {
                    from: "orders",
                    localField: "orders",
                    foreignField: "_id",
                    as: "orderData"
                }
            },
            { $unwind: "$orderData" },
            { $unwind: "$orderData.items" },
            {
                $lookup: {
                    from: "menuitems",
                    localField: "orderData.items.itemId",
                    foreignField: "_id",
                    as: "itemData"
                }
            },
            { $unwind: "$itemData" },
            {
                $group: {
                    _id: "$orderData.items.itemId",
                    name: { $first: "$itemData.name" },
                    quantity: { $sum: "$orderData.items.quantity" },
                    revenue: { $sum: "$orderData.items.totalPrice" }
                }
            },
            { $sort: { quantity: -1 } },
            { $limit: 10 },
            {
                $project: {
                    _id: 0,
                    name: 1,
                    quantity: 1,
                    revenue: 1
                }
            }
        ]);
        res.json({
            summary: summary[0] || {
                totalRevenue: 0,
                totalOrders: 0,
                totalBills: 0,
                avgOrderValue: 0
            },
            trends: {
                daily: salesTrends
            },
            topItems
        });
    }
    catch (error) {
        console.error("Get sales report error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getSalesReport = getSalesReport;
const exportReport = async (req, res) => {
    try {
        const { format = 'csv', startDate, endDate } = req.query;
        let dateFilter = {};
        if (startDate)
            dateFilter.$gte = new Date(startDate);
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            dateFilter.$lte = endOfDay;
        }
        // Get comprehensive data for export
        const bills = await Bill_1.default.find({
            createdAt: dateFilter
        })
            .populate({
            path: 'orders',
            populate: {
                path: 'items.itemId',
                select: 'name price category'
            }
        })
            .populate('customerId', 'name phone email')
            .sort({ createdAt: -1 });
        // Get expense data for the same period
        const expenses = await Expense_1.default.find({
            date: dateFilter
        })
            .populate('createdBy', 'name')
            .sort({ date: -1 });
        if (format === 'csv') {
            // Generate comprehensive CSV report
            let csvContent = '';
            // Sales summary
            csvContent += 'SALES SUMMARY\n';
            csvContent += 'Date,Bill Number,Customer,Total,Tax,Discount,Payment Methods,Items\n';
            for (const bill of bills) {
                const customer = bill.customerId?.name || 'Walk-in';
                const paymentMethods = bill.paymentMethods.map(pm => `${pm.type}:${pm.amount}`).join(';');
                const items = bill.orders.flatMap((order) => order.items.map((item) => `${item.itemId.name}(${item.quantity})`)).join(';');
                csvContent += [
                    bill.createdAt.toISOString().split('T')[0],
                    bill.billNumber,
                    `"${customer}"`,
                    bill.total,
                    bill.tax,
                    bill.discount,
                    `"${paymentMethods}"`,
                    `"${items}"`
                ].join(',') + '\n';
            }
            // Expenses summary
            csvContent += '\n\nEXPENSES SUMMARY\n';
            csvContent += 'Date,Category,Amount,Payment Method,Notes,Created By\n';
            for (const expense of expenses) {
                csvContent += [
                    expense.date.toISOString().split('T')[0],
                    expense.category,
                    expense.amount,
                    expense.paymentMethod,
                    `"${(expense.notes || '').replace(/"/g, '""')}"`,
                    expense.createdBy?.name || 'Unknown'
                ].join(',') + '\n';
            }
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="comprehensive-report-${startDate}-to-${endDate}.csv"`);
            res.send(csvContent);
        }
        else {
            // Return JSON for PDF processing on frontend
            res.json({
                bills,
                expenses,
                summary: {
                    totalRevenue: bills.reduce((sum, bill) => sum + bill.total, 0),
                    totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
                    totalBills: bills.length,
                    totalExpenseItems: expenses.length,
                    dateRange: { startDate, endDate }
                },
                format,
                exportedAt: new Date()
            });
        }
    }
    catch (error) {
        console.error("Export report error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.exportReport = exportReport;
