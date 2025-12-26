import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Pagination } from '../components/Pagination';
import { Expense, ExpenseReport, Budget, BudgetVsActual } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import {
  Plus,
  Edit,
  Trash2,
  Download,
  Filter,
  Calendar,
  TrendingUp,
  DollarSign,
  Receipt,
  PieChart,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

const CATEGORIES = [
  'Food Supplies', 'Beverages', 'Utilities', 'Rent',
  'Salaries', 'Maintenance', 'Marketing', 'Other'
];

const PAYMENT_METHODS = ['Cash', 'E-sewa', 'Khalti', 'Bank Transfer', 'Credit'];

interface ExpenseFormData {
  date: string;
  category: string;
  amount: string;
  paymentMethod: string;
  notes: string;
}

const ExpenseForm: React.FC<{
  expense?: Expense;
  onSave: (data: ExpenseFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ expense, onSave, onCancel, isLoading = false }) => {
  const [formData, setFormData] = useState<ExpenseFormData>({
    date: expense?.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    category: expense?.category || '',
    amount: expense?.amount?.toString() || '',
    paymentMethod: expense?.paymentMethod || '',
    notes: expense?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.amount || !formData.paymentMethod) {
      toast.error('Please fill in all required fields');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Date *</label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Category *</label>
        <Select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          required
        >
          <option value="">Select category</option>
          {CATEGORIES.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Amount *</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          placeholder="0.00"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Payment Method *</label>
        <Select
          value={formData.paymentMethod}
          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
          required
        >
          <option value="">Select payment method</option>
          {PAYMENT_METHODS.map(method => (
            <option key={method} value={method}>{method}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Notes</label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          placeholder="Optional notes..."
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
};

const ExpensesList: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: '',
    paymentMethod: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const { user } = useAuth();

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response: any = await apiService.getExpenses({
        ...filters,
        page: currentPage,
        limit: itemsPerPage,
      });
      setExpenses(response.expenses || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalItems(response.pagination?.totalItems || 0);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [currentPage, itemsPerPage, filters]);

  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [filters]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleAddExpense = async (data: ExpenseFormData) => {
    try {
      await apiService.addExpense({
        date: data.date,
        category: data.category,
        amount: parseFloat(data.amount),
        paymentMethod: data.paymentMethod,
        notes: data.notes || undefined,
      });
      toast.success('Expense added successfully');
      setShowAddModal(false);
      fetchExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    }
  };

  const handleEditExpense = async (data: ExpenseFormData) => {
    if (!editingExpense) return;
    try {
      await apiService.updateExpense(editingExpense._id, {
        date: data.date,
        category: data.category,
        amount: parseFloat(data.amount),
        paymentMethod: data.paymentMethod,
        notes: data.notes || undefined,
      });
      toast.success('Expense updated successfully');
      setEditingExpense(null);
      fetchExpenses();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense');
    }
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await apiService.deleteExpense(expense._id);
      toast.success('Expense deleted successfully');
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const exportExpenses = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      if (format === 'csv') {
        const blob = await apiService.exportExpenses({ format, ...filters });
        const url = window.URL.createObjectURL(blob as Blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const data: any = await apiService.exportExpenses({ format, ...filters });
        toast.success(`Export ready: ${data.totalRecords} records`);
      }
    } catch (error) {
      console.error('Error exporting expenses:', error);
      toast.error('Failed to export expenses');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Method</label>
              <Select
                value={filters.paymentMethod}
                onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
              >
                <option value="">All Methods</option>
                {PAYMENT_METHODS.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ startDate: '', endDate: '', category: '', paymentMethod: '' });
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => exportExpenses('csv')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Expense</DialogTitle>
                  </DialogHeader>
                  <ExpenseForm
                    onSave={handleAddExpense}
                    onCancel={() => setShowAddModal(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                <p className="text-muted-foreground">Loading expenses...</p>
              </div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Receipt className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">No expenses found</p>
                  <p className="text-muted-foreground">
                    {Object.values(filters).some(f => f)
                      ? "Try adjusting your filters or add your first expense"
                      : "Get started by adding your first expense"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => (
                <div
                  key={expense._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-primary-foreground"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{expense.category}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(expense.date).toLocaleDateString()} • {expense.paymentMethod}
                        </p>
                        {expense.notes && (
                          <p className="text-sm text-gray-600 mt-1">{expense.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-semibold">रू {expense.amount.toFixed(2)}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingExpense(expense)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user?.role === 'Admin' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Enhanced Pagination */}
          {totalItems > 0 && (
            <div className="mt-6 border-t pt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={[10, 20, 50, 100]}
                showItemsPerPage={true}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <ExpenseForm
              expense={editingExpense}
              onSave={handleEditExpense}
              onCancel={() => setEditingExpense(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ExpenseReports: React.FC = () => {
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response: any = await apiService.getExpenseReports({
        period,
        ...dateRange,
      });
      setReport(response);
    } catch (error) {
      console.error('Error fetching expense reports:', error);
      toast.error('Failed to load expense reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period, dateRange]);

  if (loading) {
    return <div className="text-center py-8">Loading reports...</div>;
  }

  if (!report) {
    return <div className="text-center py-8">No report data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">रू {report.summary.totalAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {report.summary.totalCount} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Period</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{period}</div>
            <p className="text-xs text-muted-foreground">
              {new Date(report.summary.dateRange.start).toLocaleDateString()} -
              {new Date(report.summary.dateRange.end).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average per Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              रू {(report.summary.totalAmount / Math.max(1, report.trends.daily.length)).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Daily average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Report Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Period</label>
              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Expenses by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={report.byCategory}
                  dataKey="total"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label={({ _id, percent }: any) => `${_id} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {report.byCategory.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`रू ${Number(value).toFixed(2)}`, 'Amount']} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Method Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Expenses by Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={report.byPaymentMethod}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip formatter={(value) => [`रू ${Number(value).toFixed(2)}`, 'Amount']} />
                <Legend />
                <Bar dataKey="total" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={report.trends.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value) => [`रू ${Number(value).toFixed(2)}`, 'Amount']}
              />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

interface BudgetFormData {
  category: string;
  budgetAmount: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  year: string;
  month: string;
  quarter: string;
}

const BudgetForm: React.FC<{
  budget?: Budget;
  onSave: (data: BudgetFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ budget, onSave, onCancel, isLoading = false }) => {
  const [formData, setFormData] = useState<BudgetFormData>({
    category: budget?.category || '',
    budgetAmount: budget?.budgetAmount?.toString() || '',
    period: budget?.period || 'monthly',
    year: budget?.year?.toString() || new Date().getFullYear().toString(),
    month: budget?.month?.toString() || '1',
    quarter: budget?.quarter?.toString() || '1',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.budgetAmount || !formData.year) {
      toast.error('Please fill in all required fields');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Category *</label>
        <Select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          required
          disabled={!!budget} // Don't allow changing category when editing
        >
          <option value="">Select category</option>
          {CATEGORIES.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Budget Amount *</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={formData.budgetAmount}
          onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
          placeholder="0.00"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Period *</label>
        <Select
          value={formData.period}
          onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
          required
          disabled={!!budget} // Don't allow changing period when editing
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Year *</label>
        <Input
          type="number"
          min="2020"
          max="2030"
          value={formData.year}
          onChange={(e) => setFormData({ ...formData, year: e.target.value })}
          required
          disabled={!!budget}
        />
      </div>
      {formData.period === 'monthly' && (
        <div>
          <label className="block text-sm font-medium mb-2">Month *</label>
          <Select
            value={formData.month}
            onChange={(e) => setFormData({ ...formData, month: e.target.value })}
            required
            disabled={!!budget}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </Select>
        </div>
      )}
      {formData.period === 'quarterly' && (
        <div>
          <label className="block text-sm font-medium mb-2">Quarter *</label>
          <Select
            value={formData.quarter}
            onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
            required
            disabled={!!budget}
          >
            <option value="1">Q1 (Jan-Mar)</option>
            <option value="2">Q2 (Apr-Jun)</option>
            <option value="3">Q3 (Jul-Sep)</option>
            <option value="4">Q4 (Oct-Dec)</option>
          </Select>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
};

const BudgetManagement: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetVsActual, setBudgetVsActual] = useState<BudgetVsActual | null>(null);
  const [, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const { user } = useAuth();

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const [budgetsResponse, budgetVsActualResponse] = await Promise.all([
        apiService.getBudgets({ year: selectedYear, active: true }),
        apiService.getBudgetVsActual({
          year: selectedYear,
          month: selectedMonth,
        })
      ]);
      setBudgets((budgetsResponse as any) || []);
      setBudgetVsActual(budgetVsActualResponse as any);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast.error('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [selectedYear, selectedMonth]);

  const handleAddBudget = async (data: BudgetFormData) => {
    try {
      await apiService.createBudget({
        category: data.category,
        budgetAmount: parseFloat(data.budgetAmount),
        period: data.period,
        year: parseInt(data.year),
        month: data.period === 'monthly' ? parseInt(data.month) : undefined,
        quarter: data.period === 'quarterly' ? parseInt(data.quarter) : undefined,
      });
      toast.success('Budget created successfully');
      setShowAddModal(false);
      fetchBudgets();
    } catch (error) {
      console.error('Error creating budget:', error);
      toast.error('Failed to create budget');
    }
  };

  const handleEditBudget = async (data: BudgetFormData) => {
    if (!editingBudget) return;
    try {
      await apiService.updateBudget(editingBudget._id, {
        budgetAmount: parseFloat(data.budgetAmount),
      });
      toast.success('Budget updated successfully');
      setEditingBudget(null);
      fetchBudgets();
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error('Failed to update budget');
    }
  };

  const handleDeleteBudget = async (budget: Budget) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) return;
    try {
      await apiService.deleteBudget(budget._id);
      toast.success('Budget deleted successfully');
      fetchBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast.error('Failed to delete budget');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'over': return 'text-red-600 bg-red-100';
      case 'under': return 'text-yellow-600 bg-yellow-100';
      case 'on-track': return 'text-green-600 bg-green-100';
      case 'no-budget': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'over': return <AlertTriangle className="h-4 w-4" />;
      case 'under': return <CheckCircle className="h-4 w-4" />;
      case 'on-track': return <CheckCircle className="h-4 w-4" />;
      case 'no-budget': return <XCircle className="h-4 w-4" />;
      default: return <XCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {budgetVsActual && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">रू {budgetVsActual.summary.totalBudget.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actual Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">रू {budgetVsActual.summary.totalActual.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {budgetVsActual.summary.totalBudget > 0
                  ? `${((budgetVsActual.summary.totalActual / budgetVsActual.summary.totalBudget) * 100).toFixed(1)}% of budget`
                  : 'No budget set'
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Over Budget</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {budgetVsActual.summary.categoriesOverBudget}
              </div>
              <p className="text-xs text-muted-foreground">Categories</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Track</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {budgetVsActual.summary.categoriesOnTrack}
              </div>
              <p className="text-xs text-muted-foreground">Categories</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Budget Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <Select
                  value={selectedYear.toString()}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={year} value={year}>{year}</option>
                    );
                  })}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Month (Optional)</label>
                <Select
                  value={selectedMonth?.toString() || ''}
                  onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : undefined)}
                >
                  <option value="">All Year</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {user?.role === 'Admin' && (
              <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Budget
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Budget</DialogTitle>
                  </DialogHeader>
                  <BudgetForm
                    onSave={handleAddBudget}
                    onCancel={() => setShowAddModal(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Budget vs Actual */}
      {budgetVsActual && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Budget vs Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budgetVsActual.budgetVsActual.map((item) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                      </div>
                      <div>
                        <h3 className="font-medium">{item.category}</h3>
                        <p className="text-sm text-gray-500">
                          Budget: रू {item.budget.toFixed(2)} |
                          Actual: रू {item.actual.toFixed(2)} |
                          Variance: रू {item.variance.toFixed(2)} ({item.variancePercent.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        {item.budget > 0 ? `${((item.actual / item.budget) * 100).toFixed(1)}%` : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">of budget</div>
                    </div>
                    {user?.role === 'Admin' && item.budget > 0 && (
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const budget = budgets.find(b => b.category === item.category);
                            if (budget) setEditingBudget(budget);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const budget = budgets.find(b => b.category === item.category);
                            if (budget) handleDeleteBudget(budget);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <Dialog open={!!editingBudget} onOpenChange={() => setEditingBudget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
          </DialogHeader>
          {editingBudget && (
            <BudgetForm
              budget={editingBudget}
              onSave={handleEditBudget}
              onCancel={() => setEditingBudget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ExpensesManagement: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Expenses Management</h1>

      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="budgets">Budget Management</TabsTrigger>
          <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-6">
          <ExpensesList />
        </TabsContent>

        <TabsContent value="budgets" className="space-y-6">
          <BudgetManagement />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ExpenseReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExpensesManagement;