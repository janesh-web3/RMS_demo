import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table as TableType, Order } from '../types';
import { apiService } from '../services/api';
import { useSocket } from '../hooks/useSocket';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [tables, setTables] = useState<TableType[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tablesResponse, ordersResponse] = await Promise.all([
          apiService.getTables(),
          apiService.getAllOrders({ limit: 10 })
        ]);
        setTables(tablesResponse);
        setOrders(ordersResponse);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (socket) {
      // Listen for table status updates
      socket.on('tableStatusUpdate', ({ tableId, status }: { tableId: string, status: 'Available' | 'Occupied' | 'Waiting for Bill' }) => {
        setTables(prevTables => 
          prevTables.map(table => 
            table._id === tableId ? { ...table, status } : table
          )
        );
      });

      // Listen for new orders
      socket.on('orderCreated', (newOrder: Order) => {
        setOrders(prevOrders => [newOrder, ...prevOrders.slice(0, 9)]);
      });

      // Listen for order status updates
      socket.on('orderStatusUpdate', ({ orderId, status }: { orderId: string, status: string }) => {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId ? { ...order, status: status as Order['status'] } : order
          )
        );
      });

      // Listen for bill creation (which affects table status)
      socket.on('billCreated', () => {
        // Refresh tables to get updated statuses
        apiService.getTables().then(setTables);
      });

      return () => {
        socket.off('tableStatusUpdate');
        socket.off('orderCreated');
        socket.off('orderStatusUpdate');
        socket.off('billCreated');
      };
    }
  }, [socket]);

  const getStats = () => {
    const availableTables = tables.filter(t => t.status === 'Available').length;
    const occupiedTables = tables.filter(t => t.status === 'Occupied').length;
    const pendingOrders = orders.filter(o => o.status === 'Pending').length;
    const cookingOrders = orders.filter(o => o.status === 'Cooking').length;

    return { availableTables, occupiedTables, pendingOrders, cookingOrders };
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const stats = getStats();

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {user?.name}! 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's what's happening at your restaurant today
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-primary/10 px-3 py-2 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-primary">{user?.role}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <Card className="animate-slide-in-left hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Available Tables</CardTitle>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.availableTables}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready to serve</p>
          </CardContent>
        </Card>

        <Card className="animate-slide-in-left hover:shadow-md transition-shadow" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Occupied Tables</CardTitle>
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{stats.occupiedTables}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently serving</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.pendingOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cooking Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.cookingOrders}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Table Status</CardTitle>
            <CardDescription>Current status of all tables</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tables.map((table) => (
                <div key={table._id} className="flex items-center justify-between p-2 rounded border">
                  <span className="font-medium">Table {table.tableNumber}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    table.status === 'Available' 
                      ? 'bg-green-100 text-green-800'
                      : table.status === 'Occupied'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {table.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {orders.slice(0, 5).map((order) => (
                <div key={order._id} className="flex items-center justify-between p-2 rounded border">
                  <div>
                    <span className="font-medium">{order.orderNumber}</span>
                    <p className="text-xs text-gray-500">
                      Table {typeof order.tableId === 'string' ? order.tableId : order.tableId.tableNumber}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    order.status === 'Pending' 
                      ? 'bg-yellow-100 text-yellow-800'
                      : order.status === 'Cooking'
                      ? 'bg-blue-100 text-blue-800'
                      : order.status === 'Ready'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;