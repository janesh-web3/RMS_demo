import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Order } from '../types';
import { apiService } from '../services/api';
import { useSocket } from '../hooks/useSocket';
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
  Calendar, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  CreditCard,
  PieChart,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Filter,
  Tag,
} from 'lucide-react';

interface DailySalesReport {
  date: string;
  totalSales: number;
  totalOrders: number;
  totalBills: number;
  totalTax: number;
  totalDiscount: number;
  paymentBreakdown: {
    Cash: number;
    'E-sewa': number;
    Khalti: number;
    'Bank Transfer': number;
  };
  topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
  topRevenueItems: Array<{ name: string; quantity: number; revenue: number }>;
  averageBillValue: number;
}

interface PaymentAnalytics {
  totalBills: number;
  totalRevenue: number;
  mixedPaymentBills: number;
  paymentBreakdown: {
    Cash: { count: number; total: number };
    'E-sewa': { count: number; total: number };
    Khalti: { count: number; total: number };
    'Bank Transfer': { count: number; total: number };
  };
  mixedPaymentPercentage: number;
}

interface MonthlyReport {
  month: number;
  year: number;
  totalSales: number;
  totalOrders: number;
  totalBills: number;
  dailySales: { [key: string]: number };
  averageDailySales: number;
}

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'payments' | 'history'>('daily');
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Report data states
  const [dailySales, setDailySales] = useState<DailySalesReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [paymentAnalytics, setPaymentAnalytics] = useState<PaymentAnalytics | null>(null);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  
  // Order history filters and pagination
  const [historyFilters, setHistoryFilters] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: '',
    tableId: '',
    includeBilled: true
  });
  
  // Separate filters for payment analytics with longer default range
  const [paymentFilters, setPaymentFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
    endDate: new Date().toISOString().split('T')[0]
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);
  const [tables, setTables] = useState<any[]>([]);

  // Real-time updates with WebSocket
  const socket = useSocket();

  useEffect(() => {
    loadData();
    loadTables(); // Load tables for filter dropdown
    
    // Set up WebSocket listeners for real-time updates
    if (socket) {
      const handleRealTimeUpdate = () => {
        if (activeTab === 'daily' || activeTab === 'payments' || activeTab === 'monthly') {
          loadData();
        }
      };

      socket.on('newOrder', handleRealTimeUpdate);
      socket.on('billCreated', handleRealTimeUpdate);
      socket.on('orderStatusUpdate', () => {
        if (activeTab === 'history') {
          loadData();
        }
      });
      socket.on('orderUpdated', () => {
        if (activeTab === 'history') {
          loadData();
        }
      });
    }

    // Fallback polling for non-real-time data
    const interval = setInterval(() => {
      if (activeTab === 'daily' || activeTab === 'payments') {
        loadData();
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('newOrder');
        socket.off('billCreated');
        socket.off('orderStatusUpdate');
        socket.off('orderUpdated');
      }
    };
  }, [activeTab, selectedDate, selectedMonth, selectedYear, socket, currentPage]);

  const loadTables = async () => {
    try {
      const tablesData = await apiService.getTables();
      setTables(tablesData);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setHistoryFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const totalPages = Math.ceil(totalOrders / ordersPerPage);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'daily':
          const dailyData = await apiService.getDailySalesReport(selectedDate);
          setDailySales(dailyData as DailySalesReport);
          break;
        case 'monthly':
          const monthlyData = await apiService.getMonthlyReport({ month: selectedMonth, year: selectedYear });
          setMonthlyReport(monthlyData as MonthlyReport);
          break;
        case 'payments':
          const paymentData = await apiService.getPaymentAnalytics(paymentFilters);
          setPaymentAnalytics(paymentData as PaymentAnalytics);
          break;
        case 'history':
          const historyResponse = await apiService.getOrderHistory({
            ...historyFilters,
            limit: ordersPerPage,
            offset: (currentPage - 1) * ordersPerPage
          });
          
          // Handle both old and new API response formats
          if (Array.isArray(historyResponse)) {
            setOrderHistory(historyResponse as Order[]);
            setTotalOrders(historyResponse.length);
          } else {
            setOrderHistory((historyResponse as any).orders || []);
            setTotalOrders((historyResponse as any).totalCount || 0);
          }
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `रू ${amount.toFixed(2)}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'Cash':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'E-sewa':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'Khalti':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'Bank Transfer':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };


  const PAYMENT_COLORS: { [key: string]: string } = {
    Cash: '#10b981',
    'E-sewa': '#3b82f6',
    Khalti: '#8b5cf6',
    'Bank Transfer': '#f59e0b',
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading reports...</div>;
  }

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reports & Analytics</h1>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Real-time data</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'daily', label: 'Daily Sales', icon: Calendar },
              { key: 'monthly', label: 'Monthly Report', icon: BarChart3 },
              { key: 'payments', label: 'Payment Analytics', icon: CreditCard },
              { key: 'history', label: 'Order History', icon: ShoppingCart }
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={activeTab === key ? 'default' : 'outline'}
                onClick={() => setActiveTab(key as any)}
                className="flex items-center space-x-2"
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Sales Report */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Daily Sales Report</span>
                </CardTitle>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </div>
            </CardHeader>
          </Card>

          {dailySales && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(dailySales.totalSales)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dailySales.totalOrders}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Avg Bill Value</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {formatCurrency(dailySales.averageBillValue)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <PieChart className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Bills</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{dailySales.totalBills}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Tag className="h-8 w-8 text-red-600 dark:text-red-400" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Discounts</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(dailySales.totalDiscount)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {Object.entries(dailySales.paymentBreakdown).map(([method, amount]) => (
                      <div key={method} className={`p-3 rounded-lg ${getPaymentMethodColor(method)}`}>
                        <div className="text-center">
                          <p className="font-medium">{method}</p>
                          <p className="text-xl font-bold">{formatCurrency(amount)}</p>
                          <p className="text-sm opacity-80">
                            {formatPercentage((amount / dailySales.totalSales) * 100)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Payment Breakdown Chart */}
                  <div className="h-64 sm:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={Object.entries(dailySales.paymentBreakdown)
                            .filter(([, amount]) => amount > 0)
                            .map(([method, amount]) => ({
                              name: method,
                              value: amount,
                              percentage: (amount / dailySales.totalSales) * 100
                            }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(dailySales.paymentBreakdown)
                            .filter(([, amount]) => amount > 0)
                            .map(([method], index) => (
                            <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[method] || '#8884d8'} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [formatCurrency(Number(value)), 'Amount']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Items */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Selling Items (by Quantity)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dailySales.topSellingItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 dark:bg-muted/30 rounded-lg border">
                          <div className="flex-1">
                            <span className="font-medium text-foreground dark:text-foreground">{item.name}</span>
                            <p className="text-sm text-muted-foreground">{item.quantity} sold</p>
                            {/* Add-ons and variations would be displayed here if available in the data */}
                            {(item as any).variations && (item as any).variations.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Variations: {(item as any).variations.join(', ')}
                              </div>
                            )}
                            {(item as any).addOns && (item as any).addOns.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Add-ons: {(item as any).addOns.join(', ')}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-foreground">{formatCurrency(item.revenue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Revenue Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dailySales.topRevenueItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 dark:bg-muted/30 rounded-lg border">
                          <div className="flex-1">
                            <span className="font-medium text-foreground dark:text-foreground">{item.name}</span>
                            <p className="text-sm text-muted-foreground">{item.quantity} sold</p>
                            {/* Add-ons and variations would be displayed here if available in the data */}
                            {(item as any).variations && (item as any).variations.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Variations: {(item as any).variations.join(', ')}
                              </div>
                            )}
                            {(item as any).addOns && (item as any).addOns.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Add-ons: {(item as any).addOns.join(', ')}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-foreground">{formatCurrency(item.revenue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* Payment Analytics */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Payment Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  type="date"
                  value={paymentFilters.startDate}
                  onChange={(e) => setPaymentFilters({ ...paymentFilters, startDate: e.target.value })}
                  placeholder="Start Date"
                />
                <Input
                  type="date"
                  value={paymentFilters.endDate}
                  onChange={(e) => setPaymentFilters({ ...paymentFilters, endDate: e.target.value })}
                  placeholder="End Date"
                />
              </div>
              <div className="mt-4">
                <Button onClick={loadData}>Load Analytics</Button>
              </div>
            </CardContent>
          </Card>

          {paymentAnalytics && (
            <>
              {paymentAnalytics.totalRevenue === 0 && (
                <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-300">
                      <div className="text-2xl">⚠️</div>
                      <div>
                        <p className="font-medium">No payment data found</p>
                        <p className="text-sm">No bills found in the selected date range ({paymentFilters.startDate} to {paymentFilters.endDate})</p>
                        <p className="text-xs mt-1">Try extending the date range or check if any bills have been created.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(paymentAnalytics.totalRevenue)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Total Bills</p>
                      <p className="text-2xl font-bold text-blue-600">{paymentAnalytics.totalBills}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Mixed Payments</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatPercentage(paymentAnalytics.mixedPaymentPercentage)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Method Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 sm:h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={Object.entries(paymentAnalytics.paymentBreakdown).map(([method, data]) => ({
                              name: method,
                              value: data.total,
                              count: data.count
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {Object.entries(paymentAnalytics.paymentBreakdown).map(([method], index) => (
                              <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[method] || '#8884d8'} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '6px'
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Transaction Count by Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 sm:h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.entries(paymentAnalytics.paymentBreakdown).map(([method, data]) => ({
                            method: method,
                            count: data.count,
                            total: data.total
                          }))}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis 
                            dataKey="method" 
                            className="text-sm"
                            tick={{ fill: 'currentColor' }}
                          />
                          <YAxis 
                            className="text-sm"
                            tick={{ fill: 'currentColor' }}
                          />
                          <Tooltip 
                            formatter={(value, name) => [
                              name === 'count' ? `${value} transactions` : formatCurrency(Number(value)),
                              name === 'count' ? 'Transactions' : 'Total Revenue'
                            ]}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '6px'
                            }}
                          />
                          <Legend />
                          <Bar dataKey="count" fill="#3b82f6" name="Transactions" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Method Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(paymentAnalytics.paymentBreakdown).map(([method, data]) => (
                      <div key={method} className={`p-4 rounded-lg ${getPaymentMethodColor(method)}`}>
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">{method}</h3>
                          <div className="text-right">
                            <p className="text-xl font-bold">{formatCurrency(data.total)}</p>
                            <p className="text-sm">{data.count} transactions</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-sm">
                            <span>Avg per transaction:</span>
                            <span>{data.count > 0 ? formatCurrency(data.total / data.count) : 'रू0.00'}</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span>Revenue share:</span>
                            <span>{paymentAnalytics.totalRevenue > 0 ? formatPercentage((data.total / paymentAnalytics.totalRevenue) * 100) : '0.0%'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Monthly Sales Report */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Monthly Sales Report</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[120px] text-center">
                    {getMonthName(selectedMonth)} {selectedYear}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {monthlyReport && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(monthlyReport.totalSales)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{monthlyReport.totalOrders}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Avg Daily Sales</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {formatCurrency(monthlyReport.averageDailySales)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <PieChart className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Bills</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{monthlyReport.totalBills}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Daily Sales Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Sales Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={Object.entries(monthlyReport.dailySales).map(([day, amount]) => ({
                          day: `Day ${day}`,
                          sales: amount,
                        }))}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis 
                          dataKey="day" 
                          className="text-sm"
                          tick={{ fill: 'currentColor' }}
                        />
                        <YAxis 
                          className="text-sm"
                          tick={{ fill: 'currentColor' }}
                          tickFormatter={(value) => `रू${value}`}
                        />
                        <Tooltip 
                          formatter={(value) => [formatCurrency(Number(value)), 'Sales']}
                          labelStyle={{ color: 'black' }}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="sales" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Bar Chart for Daily Sales */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Sales Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(monthlyReport.dailySales).map(([day, amount]) => ({
                          day: day,
                          sales: amount,
                        }))}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis 
                          dataKey="day" 
                          className="text-sm"
                          tick={{ fill: 'currentColor' }}
                        />
                        <YAxis 
                          className="text-sm"
                          tick={{ fill: 'currentColor' }}
                          tickFormatter={(value) => `रू${value}`}
                        />
                        <Tooltip 
                          formatter={(value) => [formatCurrency(Number(value)), 'Sales']}
                          labelFormatter={(label) => `Day ${label}`}
                          labelStyle={{ color: 'black' }}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="sales" fill="#10b981" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Order History */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Order History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Input
                    type="date"
                    value={historyFilters.startDate}
                    onChange={(e) => handleFilterChange({ ...historyFilters, startDate: e.target.value })}
                    placeholder="Start Date"
                  />
                  <Input
                    type="date"
                    value={historyFilters.endDate}
                    onChange={(e) => handleFilterChange({ ...historyFilters, endDate: e.target.value })}
                    placeholder="End Date"
                  />
                  <select
                    value={historyFilters.status}
                    onChange={(e) => handleFilterChange({ ...historyFilters, status: e.target.value })}
                    className="border rounded px-3 py-2 bg-background text-foreground border-input"
                  >
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Cooking">Cooking</option>
                    <option value="Ready">Ready</option>
                    <option value="Served">Served</option>
                  </select>
                  <select
                    value={historyFilters.tableId}
                    onChange={(e) => handleFilterChange({ ...historyFilters, tableId: e.target.value })}
                    className="border rounded px-3 py-2 bg-background text-foreground border-input"
                  >
                    <option value="">All Tables</option>
                    {tables.map((table: any) => (
                      <option key={table._id} value={table._id}>
                        Table {table.tableNumber}
                      </option>
                    ))}
                  </select>
                  <Button onClick={loadData} className="flex items-center space-x-2">
                    <Filter className="h-4 w-4" />
                    <span>Apply Filters</span>
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={historyFilters.includeBilled}
                      onChange={(e) => handleFilterChange({ ...historyFilters, includeBilled: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Include billed orders</span>
                  </label>
                  <div className="text-sm text-muted-foreground">
                    Showing {orderHistory.length} orders
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Orders ({orderHistory.length} found)</CardTitle>
                {totalPages > 1 && (
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto overscroll-contain">
                {orderHistory.map((order) => (
                  <div key={order._id} className="border border-border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-foreground">Order #{order.orderNumber}</span>
                        {order.isBilled && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 text-xs rounded-full">
                            Billed
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          order.status === 'Served' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                          order.status === 'Ready' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                          order.status === 'Cooking' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-lg text-foreground">{formatCurrency(order.totalAmount)}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-3">
                      <p>🏼 Table: {typeof order.tableId === 'object' ? order.tableId.tableNumber : order.tableId}</p>
                      <p>🕓 Created: {new Date(order.createdAt).toLocaleString()}</p>
                      {order.waiterId && typeof order.waiterId === 'object' && (
                        <p>👨‍🍳 Waiter: {order.waiterId.name}</p>
                      )}
                      {order.billedAt && (
                        <p>🧾 Billed: {new Date(order.billedAt).toLocaleString()}</p>
                      )}
                      {order.specialNotes && (
                        <p className="col-span-full">📝 Notes: {order.specialNotes}</p>
                      )}
                    </div>
                    
                    {/* Order Items */}
                    {order.items && order.items.length > 0 && (
                      <div className="border-t border-border pt-2 sm:pt-3">
                        <p className="text-xs sm:text-sm font-medium text-foreground mb-2">Order Items:</p>
                        <div className="space-y-1 sm:space-y-2 max-h-32 overflow-y-auto">
                          {order.items.map((item: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-xs sm:text-sm">
                              <div className="flex-1 min-w-0">
                                <span className="font-medium truncate block">
                                  {typeof item.itemId === 'object' ? item.itemId.name : item.itemId}
                                </span>
                                <div className="text-muted-foreground text-xs flex flex-wrap items-center gap-1">
                                  {item.selectedVariation && (
                                    <span>({item.selectedVariation})</span>
                                  )}
                                  {item.addOns && item.addOns.length > 0 && (
                                    <span>+ {item.addOns.join(', ')}</span>
                                  )}
                                  <span>× {item.quantity}</span>
                                </div>
                              </div>
                              <span className="font-medium text-xs sm:text-sm ml-2">{formatCurrency(item.totalPrice || 0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {orderHistory.length === 0 && (
                <div className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No orders found for the selected filters</p>
                  <p className="text-sm text-muted-foreground mt-2">Try adjusting your date range or removing some filters</p>
                </div>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-6 pt-4 border-t border-border">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    First
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Last
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Reports;