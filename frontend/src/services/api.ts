import { server } from "@/server";

const API_BASE_URL = server;

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return this.handleResponse(response);
  }

  async getCurrentUser(): Promise<{ user: any }> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async register(userData: { name: string; email: string; password: string; role?: string }) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return this.handleResponse(response);
  }

  async getTables(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/tables`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createTable(tableData: { tableNumber: string }) {
    const response = await fetch(`${API_BASE_URL}/tables`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(tableData),
    });
    return this.handleResponse(response);
  }

  async updateTable(id: string, updates: { tableNumber?: string; status?: string }) {
    const response = await fetch(`${API_BASE_URL}/tables/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return this.handleResponse(response);
  }

  async deleteTable(id: string) {
    const response = await fetch(`${API_BASE_URL}/tables/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getMenuItems(params?: { category?: string; active?: boolean }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.active !== undefined) searchParams.append('active', params.active.toString());
    
    const response = await fetch(`${API_BASE_URL}/menu?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createMenuItem(menuData: any) {
    const response = await fetch(`${API_BASE_URL}/menu`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(menuData),
    });
    return this.handleResponse(response);
  }

  async updateMenuItem(id: string, updates: any) {
    const response = await fetch(`${API_BASE_URL}/menu/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return this.handleResponse(response);
  }

  async deleteMenuItem(id: string) {
    const response = await fetch(`${API_BASE_URL}/menu/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createOrder(orderData: any) {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(orderData),
    });
    return this.handleResponse(response);
  }

  async addItemsToOrder(orderId: string, items: any[]) {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/add-items`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ items }),
    });
    return this.handleResponse(response);
  }

  async getOrders(params?: { status?: string; limit?: number }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const response = await fetch(`${API_BASE_URL}/orders?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getOrdersByTable(tableId: string, status?: string) {
    const searchParams = new URLSearchParams();
    if (status) searchParams.append('status', status);
    
    const response = await fetch(`${API_BASE_URL}/orders/table/${tableId}?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getActiveOrderForTable(tableId: string) {
    const response = await fetch(`${API_BASE_URL}/orders/table/${tableId}/active`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getOrdersBySession(tableId: string, sessionId: string) {
    const response = await fetch(`${API_BASE_URL}/orders/table/${tableId}/session/${sessionId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getAllOrders(params?: { status?: string; limit?: number }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await fetch(`${API_BASE_URL}/orders?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getOrderById(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async updateOrderStatus(id: string, status: string) {
    const response = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return this.handleResponse(response);
  }

  async printOrder(orderId: string) {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/print`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createBill(billData: { tableId: string; paymentMethods: any[]; discount?: number; selectedOrders?: string[]; customerId?: string }) {
    const response = await fetch(`${API_BASE_URL}/bills`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(billData),
    });
    return this.handleResponse(response);
  }

  async getBills(params?: { startDate?: string; endDate?: string; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const response = await fetch(`${API_BASE_URL}/bills?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getBill(id: string) {
    const response = await fetch(`${API_BASE_URL}/bills/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getBillPreview(tableId: string, discount: number = 0, selectedOrders?: string[]) {
    const searchParams = new URLSearchParams();
    if (discount > 0) searchParams.append('discount', discount.toString());
    if (selectedOrders && selectedOrders.length > 0) {
      searchParams.append('selectedOrders', selectedOrders.join(','));
    }
    
    const response = await fetch(`${API_BASE_URL}/bills/preview/${tableId}?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async printBill(billId: string) {
    const response = await fetch(`${API_BASE_URL}/bills/${billId}/print`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getDailySalesReport(date?: string) {
    const searchParams = new URLSearchParams();
    if (date) searchParams.append('date', date);
    
    const response = await fetch(`${API_BASE_URL}/reports/daily-sales?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getOrderHistory(params?: { 
    startDate?: string; 
    endDate?: string; 
    tableId?: string; 
    status?: string; 
    limit?: number;
    offset?: number;
    includeBilled?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.tableId) searchParams.append('tableId', params.tableId);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    if (params?.includeBilled !== undefined) searchParams.append('includeBilled', params.includeBilled.toString());
    
    const response = await fetch(`${API_BASE_URL}/reports/order-history?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getPaymentAnalytics(params?: { startDate?: string; endDate?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    
    const response = await fetch(`${API_BASE_URL}/reports/payment-analytics?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getMonthlyReport(params?: { month?: number; year?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.month) searchParams.append('month', params.month.toString());
    if (params?.year) searchParams.append('year', params.year.toString());
    
    const response = await fetch(`${API_BASE_URL}/reports/monthly?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async printKitchenOrder(orderId: string) {
    const response = await fetch(`${API_BASE_URL}/print/kitchen`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ orderId }),
    });
    return this.handleResponse(response);
  }

  // User Management
  async getAllUsers(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/auth/users`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createUser(userData: { name: string; email: string; password: string; role: string }) {
    const response = await fetch(`${API_BASE_URL}/auth/users`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return this.handleResponse(response);
  }

  async updateUser(userId: string, userData: { name?: string; email?: string; role?: string }) {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return this.handleResponse(response);
  }

  async updateUserPassword(userId: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}/password`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ password }),
    });
    return this.handleResponse(response);
  }

  async deleteUser(userId: string) {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }
  // Customer Management
  async getCustomers(params?: { 
    search?: string; 
    hasCredit?: boolean; 
    limit?: number; 
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.hasCredit !== undefined) queryParams.append('hasCredit', params.hasCredit.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const response = await fetch(`${API_BASE_URL}/customers?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getCustomer(id: string) {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createCustomer(customerData: { 
    name: string; 
    phone?: string; 
    email?: string; 
    address?: string; 
  }) {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(customerData),
    });
    return this.handleResponse(response);
  }

  async updateCustomer(id: string, customerData: { 
    name?: string; 
    phone?: string; 
    email?: string; 
    address?: string; 
  }) {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(customerData),
    });
    return this.handleResponse(response);
  }

  async deleteCustomer(id: string) {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async addCreditPayment(customerId: string, paymentData: { 
    amount: number; 
    description?: string; 
  }) {
    const response = await fetch(`${API_BASE_URL}/customers/${customerId}/credit-payment`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(paymentData),
    });
    return this.handleResponse(response);
  }

  async getCreditHistory(customerId: string, params?: { 
    limit?: number; 
    offset?: number; 
  }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await fetch(`${API_BASE_URL}/customers/${customerId}/credit-history?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getCustomersWithCredit(params?: { limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(`${API_BASE_URL}/customers/with-credit?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getCreditAnalytics(params?: { startDate?: string; endDate?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const response = await fetch(`${API_BASE_URL}/reports/credit-analytics?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Expense Management
  async addExpense(expenseData: {
    date?: string;
    category: string;
    amount: number;
    paymentMethod: string;
    notes?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/expenses/add`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(expenseData),
    });
    return this.handleResponse(response);
  }

  async updateExpense(id: string, expenseData: {
    date?: string;
    category?: string;
    amount?: number;
    paymentMethod?: string;
    notes?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/expenses/update/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(expenseData),
    });
    return this.handleResponse(response);
  }

  async deleteExpense(id: string) {
    const response = await fetch(`${API_BASE_URL}/expenses/delete/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getExpenses(params?: {
    startDate?: string;
    endDate?: string;
    category?: string;
    paymentMethod?: string;
    limit?: number;
    page?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.paymentMethod) queryParams.append('paymentMethod', params.paymentMethod);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.page) queryParams.append('page', params.page.toString());

    const response = await fetch(`${API_BASE_URL}/expenses?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getExpenseReports(params?: {
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate?: string;
    endDate?: string;
    category?: string;
    paymentMethod?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append('period', params.period);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.paymentMethod) queryParams.append('paymentMethod', params.paymentMethod);

    const response = await fetch(`${API_BASE_URL}/expenses/reports?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async exportExpenses(params?: {
    format?: 'csv' | 'excel' | 'pdf';
    startDate?: string;
    endDate?: string;
    category?: string;
    paymentMethod?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.format) queryParams.append('format', params.format);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.paymentMethod) queryParams.append('paymentMethod', params.paymentMethod);

    const response = await fetch(`${API_BASE_URL}/expenses/export?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });

    if (params?.format === 'csv') {
      return response.blob();
    }
    return this.handleResponse(response);
  }

  // Budget Management
  async createBudget(budgetData: {
    category: string;
    budgetAmount: number;
    period: 'monthly' | 'quarterly' | 'yearly';
    year: number;
    month?: number;
    quarter?: number;
  }) {
    const response = await fetch(`${API_BASE_URL}/expenses/budgets`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(budgetData),
    });
    return this.handleResponse(response);
  }

  async updateBudget(id: string, budgetData: {
    budgetAmount?: number;
    isActive?: boolean;
  }) {
    const response = await fetch(`${API_BASE_URL}/expenses/budgets/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(budgetData),
    });
    return this.handleResponse(response);
  }

  async deleteBudget(id: string) {
    const response = await fetch(`${API_BASE_URL}/expenses/budgets/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getBudgets(params?: {
    category?: string;
    period?: string;
    year?: number;
    month?: number;
    quarter?: number;
    active?: boolean;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.period) queryParams.append('period', params.period);
    if (params?.year) queryParams.append('year', params.year.toString());
    if (params?.month) queryParams.append('month', params.month.toString());
    if (params?.quarter) queryParams.append('quarter', params.quarter.toString());
    if (params?.active !== undefined) queryParams.append('active', params.active.toString());

    const response = await fetch(`${API_BASE_URL}/expenses/budgets?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getBudgetVsActual(params?: {
    year?: number;
    month?: number;
    quarter?: number;
    category?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.year) queryParams.append('year', params.year.toString());
    if (params?.month) queryParams.append('month', params.month.toString());
    if (params?.quarter) queryParams.append('quarter', params.quarter.toString());
    if (params?.category) queryParams.append('category', params.category);

    const response = await fetch(`${API_BASE_URL}/expenses/budget-vs-actual?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }
}

export const apiService = new ApiService();