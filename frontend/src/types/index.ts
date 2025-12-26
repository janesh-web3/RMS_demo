export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Waiter' | 'Cashier' | 'Kitchen';
  notificationSettings: {
    soundEnabled: boolean;
    volume: number;
  };
}

export interface Table {
  _id: string;
  tableNumber: string;
  status: 'Available' | 'Occupied' | 'Waiting for Bill';
  createdAt: string;
  updatedAt: string;
}

export interface MenuVariation {
  name: string;
  price: number;
}

export interface MenuAddOn {
  name: string;
  price: number;
}

export interface MenuItem {
  _id: string;
  name: string;
  price: number; // Base price
  category: 'Starters' | 'Mains' | 'Desserts' | 'Drinks';
  variations: MenuVariation[];
  addOns: MenuAddOn[];
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  itemId: string | MenuItem;
  quantity: number;
  notes?: string;
  selectedVariation?: string;
  addOns?: string[];
  itemPrice: number;
  addOnPrice: number;
  totalPrice: number;
}

export interface Order {
  _id: string;
  tableId: string | Table;
  items: OrderItem[];
  status: 'Pending' | 'Cooking' | 'Ready' | 'Served';
  orderNumber: string;
  waiterId?: string | User;
  sessionId?: string;
  totalAmount: number;
  isBilled: boolean;
  billedAt?: string;
  billId?: string | Bill;
  specialNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  type: 'Cash' | 'E-sewa' | 'Khalti' | 'Bank Transfer' | 'Credit';
  amount: number | string;
}

export interface Bill {
  _id: string;
  tableId: string | Table;
  orders: string[] | Order[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethods: PaymentMethod[];
  billNumber: string;
  customerId?: string | Customer;
  creditAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditBalance: number;
  totalCreditGiven: number;
  totalCreditPaid: number;
  creditTransactions: CreditTransaction[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreditTransaction {
  type: 'Credit' | 'Payment';
  amount: number;
  billId?: string;
  description?: string;
  createdAt: string;
}

export interface Expense {
  _id: string;
  date: string;
  category: 'Food Supplies' | 'Beverages' | 'Utilities' | 'Rent' | 'Salaries' | 'Maintenance' | 'Marketing' | 'Other';
  amount: number;
  paymentMethod: 'Cash' | 'E-sewa' | 'Khalti' | 'Bank Transfer' | 'Credit';
  notes?: string;
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseReport {
  summary: {
    totalAmount: number;
    totalCount: number;
    period: string;
    dateRange: {
      start: string;
      end: string;
    };
  };
  byCategory: Array<{
    _id: string;
    total: number;
    count: number;
  }>;
  byPaymentMethod: Array<{
    _id: string;
    total: number;
    count: number;
  }>;
  trends: {
    daily: Array<{
      date: string;
      total: number;
      count: number;
    }>;
    monthly: Array<{
      date: string;
      total: number;
      count: number;
    }>;
  };
}

export interface Budget {
  _id: string;
  category: 'Food Supplies' | 'Beverages' | 'Utilities' | 'Rent' | 'Salaries' | 'Maintenance' | 'Marketing' | 'Other';
  budgetAmount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  year: number;
  month?: number;
  quarter?: number;
  isActive: boolean;
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetVsActual {
  budgetVsActual: Array<{
    category: string;
    budget: number;
    actual: number;
    variance: number;
    variancePercent: number;
    status: 'over' | 'under' | 'on-track' | 'no-budget';
    period: string;
    year: number;
    month?: number;
    quarter?: number;
    transactionCount: number;
  }>;
  summary: {
    totalBudget: number;
    totalActual: number;
    categoriesOverBudget: number;
    categoriesOnTrack: number;
    categoriesUnderBudget: number;
    categoriesWithoutBudget: number;
  };
  period: {
    year: number;
    month?: number;
    quarter?: number;
  };
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}