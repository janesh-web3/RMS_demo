import { Response } from "express";
import Budget from "../models/Budget";
import Expense from "../models/Expense";
import { AuthRequest } from "../middleware/auth";
import mongoose from "mongoose";

export const createBudget = async (req: AuthRequest, res: Response) => {
  try {
    const { category, budgetAmount, period, year, month, quarter } = req.body;

    if (!category || !budgetAmount || !period || !year) {
      return res.status(400).json({
        message: "Category, budget amount, period, and year are required",
      });
    }

    if (budgetAmount <= 0) {
      return res.status(400).json({
        message: "Budget amount must be greater than 0",
      });
    }

    // Validate period-specific requirements
    if (period === 'monthly' && !month) {
      return res.status(400).json({
        message: "Month is required for monthly budgets",
      });
    }

    if (period === 'quarterly' && !quarter) {
      return res.status(400).json({
        message: "Quarter is required for quarterly budgets",
      });
    }

    const budgetData: any = {
      category,
      budgetAmount: parseFloat(budgetAmount.toString()),
      period,
      year: parseInt(year.toString()),
      createdBy: req.user!._id,
    };

    if (period === 'monthly') {
      budgetData.month = parseInt(month.toString());
    }

    if (period === 'quarterly') {
      budgetData.quarter = parseInt(quarter.toString());
    }

    const budget = new Budget(budgetData);
    await budget.save();
    await budget.populate("createdBy", "name");

    res.status(201).json(budget);
  } catch (error: any) {
    console.error("Create budget error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Budget already exists for this category and period",
      });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateBudget = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { budgetAmount, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid budget ID" });
    }

    const budget = await Budget.findById(id);
    if (!budget) {
      return res.status(404).json({ message: "Budget not found" });
    }

    const updatedData: any = {};
    if (budgetAmount !== undefined) {
      if (budgetAmount <= 0) {
        return res.status(400).json({
          message: "Budget amount must be greater than 0",
        });
      }
      updatedData.budgetAmount = parseFloat(budgetAmount.toString());
    }
    if (isActive !== undefined) updatedData.isActive = isActive;

    const updatedBudget = await Budget.findByIdAndUpdate(
      id,
      updatedData,
      { new: true }
    ).populate("createdBy", "name");

    res.json(updatedBudget);
  } catch (error) {
    console.error("Update budget error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteBudget = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid budget ID" });
    }

    const budget = await Budget.findById(id);
    if (!budget) {
      return res.status(404).json({ message: "Budget not found" });
    }

    await Budget.findByIdAndDelete(id);
    res.json({ message: "Budget deleted successfully" });
  } catch (error) {
    console.error("Delete budget error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getBudgets = async (req: AuthRequest, res: Response) => {
  try {
    const { category, period, year, month, quarter, active } = req.query;

    let filter: any = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (period && period !== 'all') {
      filter.period = period;
    }

    if (year) {
      filter.year = parseInt(year as string);
    }

    if (month) {
      filter.month = parseInt(month as string);
    }

    if (quarter) {
      filter.quarter = parseInt(quarter as string);
    }

    if (active !== undefined) {
      filter.isActive = active === 'true';
    }

    const budgets = await Budget.find(filter)
      .populate("createdBy", "name")
      .sort({ year: -1, month: -1, quarter: -1 });

    res.json(budgets);
  } catch (error) {
    console.error("Get budgets error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getBudgetVsActual = async (req: AuthRequest, res: Response) => {
  try {
    const { year, month, quarter, category } = req.query;
    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();

    let filter: any = { year: currentYear, isActive: true };
    let dateFilter: any = {
      date: {
        $gte: new Date(currentYear, 0, 1),
        $lt: new Date(currentYear + 1, 0, 1)
      }
    };

    if (month) {
      const monthNum = parseInt(month as string);
      filter.month = monthNum;
      filter.period = { $in: ['monthly'] };
      dateFilter.date = {
        $gte: new Date(currentYear, monthNum - 1, 1),
        $lt: new Date(currentYear, monthNum, 1)
      };
    } else if (quarter) {
      const quarterNum = parseInt(quarter as string);
      filter.quarter = quarterNum;
      filter.period = { $in: ['quarterly'] };
      const startMonth = (quarterNum - 1) * 3;
      const endMonth = quarterNum * 3;
      dateFilter.date = {
        $gte: new Date(currentYear, startMonth, 1),
        $lt: new Date(currentYear, endMonth, 1)
      };
    }

    if (category && category !== 'all') {
      filter.category = category;
      dateFilter.category = category;
    }

    // Get budgets
    const budgets = await Budget.find(filter);

    // Get actual expenses
    const actualExpenses = await Expense.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$category",
          actual: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    // Combine budget vs actual
    const budgetVsActual = budgets.map(budget => {
      const actual = actualExpenses.find(exp => exp._id === budget.category);
      const actualAmount = actual ? actual.actual : 0;
      const variance = actualAmount - budget.budgetAmount;
      const variancePercent = budget.budgetAmount > 0 ? (variance / budget.budgetAmount) * 100 : 0;

      return {
        category: budget.category,
        budget: budget.budgetAmount,
        actual: actualAmount,
        variance,
        variancePercent,
        status: variance > 0 ? 'over' : variance < -budget.budgetAmount * 0.1 ? 'under' : 'on-track',
        period: budget.period,
        year: budget.year,
        month: budget.month,
        quarter: budget.quarter,
        transactionCount: actual ? actual.count : 0
      };
    });

    // Get categories with expenses but no budget
    const categoriesWithBudget = budgets.map(b => b.category);
    const expensesWithoutBudget = actualExpenses
      .filter(exp => !categoriesWithBudget.includes(exp._id))
      .map(exp => ({
        category: exp._id,
        budget: 0,
        actual: exp.actual,
        variance: exp.actual,
        variancePercent: 100,
        status: 'no-budget',
        period: null,
        year: currentYear,
        month: null,
        quarter: null,
        transactionCount: exp.count
      }));

    const result = {
      budgetVsActual: [...budgetVsActual, ...expensesWithoutBudget],
      summary: {
        totalBudget: budgets.reduce((sum, budget) => sum + budget.budgetAmount, 0),
        totalActual: actualExpenses.reduce((sum, exp) => sum + exp.actual, 0),
        categoriesOverBudget: budgetVsActual.filter(item => item.status === 'over').length,
        categoriesOnTrack: budgetVsActual.filter(item => item.status === 'on-track').length,
        categoriesUnderBudget: budgetVsActual.filter(item => item.status === 'under').length,
        categoriesWithoutBudget: expensesWithoutBudget.length
      },
      period: {
        year: currentYear,
        month: month ? parseInt(month as string) : null,
        quarter: quarter ? parseInt(quarter as string) : null
      }
    };

    res.json(result);
  } catch (error) {
    console.error("Get budget vs actual error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};