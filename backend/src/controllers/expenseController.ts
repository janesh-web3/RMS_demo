import { Response } from "express";
import Expense from "../models/Expense";
import { AuthRequest } from "../middleware/auth";
import mongoose from "mongoose";

export const addExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { date, category, amount, paymentMethod, notes } = req.body;

    if (!category || !amount || !paymentMethod) {
      return res.status(400).json({
        message: "Category, amount, and payment method are required",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than 0",
      });
    }

    const expense = new Expense({
      date: date ? new Date(date) : new Date(),
      category,
      amount: parseFloat(amount.toString()),
      paymentMethod,
      notes: notes?.trim(),
      createdBy: req.user!._id,
    });

    await expense.save();
    await expense.populate("createdBy", "name");

    res.status(201).json(expense);
  } catch (error) {
    console.error("Add expense error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { date, category, amount, paymentMethod, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid expense ID" });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    if (amount && amount <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than 0",
      });
    }

    const updatedData: any = {};
    if (date) updatedData.date = new Date(date);
    if (category) updatedData.category = category;
    if (amount) updatedData.amount = parseFloat(amount.toString());
    if (paymentMethod) updatedData.paymentMethod = paymentMethod;
    if (notes !== undefined) updatedData.notes = notes?.trim();

    const updatedExpense = await Expense.findByIdAndUpdate(
      id,
      updatedData,
      { new: true }
    ).populate("createdBy", "name");

    res.json(updatedExpense);
  } catch (error) {
    console.error("Update expense error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid expense ID" });
    }

    // Check if user has Admin role
    if (req.user!.role !== 'Admin') {
      return res.status(403).json({
        message: "Only admin users can delete expenses"
      });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    await Expense.findByIdAndDelete(id);
    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Delete expense error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      category,
      paymentMethod,
      limit = 20,
      page = 1
    } = req.query;

    let filter: any = {};

    // Date filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) filter.date.$lte = new Date(endDate as string);
    }

    // Category filter
    if (category && category !== 'all') {
      filter.category = category;
    }

    // Payment method filter
    if (paymentMethod && paymentMethod !== 'all') {
      filter.paymentMethod = paymentMethod;
    }

    const limitNum = parseInt(limit as string);
    const pageNum = parseInt(page as string);
    const skip = (pageNum - 1) * limitNum;

    // Ensure reasonable limits
    const safeLimit = Math.min(Math.max(limitNum, 1), 100);

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .populate("createdBy", "name")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      Expense.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / safeLimit);

    res.json({
      expenses,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: safeLimit,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error("Get expenses error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getExpenseReports = async (req: AuthRequest, res: Response) => {
  try {
    const {
      period = 'monthly',
      startDate,
      endDate,
      category,
      paymentMethod
    } = req.query;

    let dateFilter: any = {};
    const now = new Date();

    // Default date ranges based on period
    if (!startDate && !endDate) {
      switch (period) {
        case 'daily':
          dateFilter = {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          };
          break;
        case 'weekly':
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          dateFilter = {
            $gte: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()),
            $lt: new Date()
          };
          break;
        case 'monthly':
          dateFilter = {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
          };
          break;
        case 'yearly':
          dateFilter = {
            $gte: new Date(now.getFullYear(), 0, 1),
            $lt: new Date(now.getFullYear() + 1, 0, 1)
          };
          break;
        default:
          // Last 30 days
          dateFilter = {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            $lt: new Date()
          };
      }
    } else {
      if (startDate) dateFilter.$gte = new Date(startDate as string);
      if (endDate) dateFilter.$lte = new Date(endDate as string);
    }

    let matchFilter: any = { date: dateFilter };
    if (category && category !== 'all') matchFilter.category = category;
    if (paymentMethod && paymentMethod !== 'all') matchFilter.paymentMethod = paymentMethod;

    // Total expenses
    const totalExpenses = await Expense.aggregate([
      { $match: matchFilter },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);

    // Expenses by category
    const expensesByCategory = await Expense.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Expenses by payment method
    const expensesByPaymentMethod = await Expense.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$paymentMethod",
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Daily trend (for charts)
    const dailyTrend = await Expense.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            day: { $dayOfMonth: "$date" }
          },
          total: { $sum: "$amount" },
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
          }
        }
      },
      { $sort: { date: 1 } },
      { $project: { _id: 0, date: 1, total: 1, count: 1 } }
    ]);

    // Monthly trend (for longer periods)
    const monthlyTrend = await Expense.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" }
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      {
        $addFields: {
          date: {
            $dateFromParts: {
              year: "$_id.year",
              month: "$_id.month",
              day: 1
            }
          }
        }
      },
      { $sort: { date: 1 } },
      { $project: { _id: 0, date: 1, total: 1, count: 1 } }
    ]);

    const report = {
      summary: {
        totalAmount: totalExpenses[0]?.total || 0,
        totalCount: totalExpenses[0]?.count || 0,
        period,
        dateRange: {
          start: dateFilter.$gte,
          end: dateFilter.$lt || dateFilter.$lte
        }
      },
      byCategory: expensesByCategory,
      byPaymentMethod: expensesByPaymentMethod,
      trends: {
        daily: dailyTrend,
        monthly: monthlyTrend
      }
    };

    res.json(report);
  } catch (error) {
    console.error("Get expense reports error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const exportExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const {
      format = 'csv',
      startDate,
      endDate,
      category,
      paymentMethod
    } = req.query;

    let filter: any = {};

    // Date filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) filter.date.$lte = new Date(endDate as string);
    }

    // Category filter
    if (category && category !== 'all') {
      filter.category = category;
    }

    // Payment method filter
    if (paymentMethod && paymentMethod !== 'all') {
      filter.paymentMethod = paymentMethod;
    }

    const expenses = await Expense.find(filter)
      .populate("createdBy", "name")
      .sort({ date: -1, createdAt: -1 });

    if (format === 'csv') {
      // Generate CSV
      const csvHeader = 'Date,Category,Amount,Payment Method,Notes,Created By,Created At\n';
      const csvRows = expenses.map(expense => {
        return [
          expense.date.toISOString().split('T')[0],
          expense.category,
          expense.amount,
          expense.paymentMethod,
          `"${(expense.notes || '').replace(/"/g, '""')}"`,
          (expense.createdBy as any)?.name || 'Unknown',
          expense.createdAt.toISOString()
        ].join(',');
      }).join('\n');

      const csv = csvHeader + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="expenses-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      // Return JSON for other formats (Excel, PDF can be handled by frontend)
      res.json({
        data: expenses,
        format,
        exportedAt: new Date(),
        totalRecords: expenses.length
      });
    }
  } catch (error) {
    console.error("Export expenses error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};