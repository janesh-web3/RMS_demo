import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import OrderManagement from "../components/OrderManagement";
import OrderGridView from "../components/OrderGridView";
import { Order, Table as TableType, MenuItem } from "../types";
import { apiService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Receipt, Grid, List } from "lucide-react";
import OrderModal from "../components/modals/OrderModal";
import { useSocket } from "../hooks/useSocket";

const Orders: React.FC = () => {
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<TableType[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [preSelectedTableId, setPreSelectedTableId] = useState<string>("");
  const [preSelectedOrderId, setPreSelectedOrderId] = useState<string>("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const socket = useSocket();

  useEffect(() => {
    fetchData();
  }, []);

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (socket) {
      const handleOrderUpdated = (updatedOrder: Order) => {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === updatedOrder._id ? updatedOrder : order
          )
        );
      };

      const handleNewOrder = (newOrder: Order) => {
        setOrders((prevOrders) => [newOrder, ...prevOrders]);
      };

      socket.on("orderUpdated", handleOrderUpdated);
      socket.on("newOrder", handleNewOrder);

      return () => {
        socket.off("orderUpdated", handleOrderUpdated);
        socket.off("newOrder", handleNewOrder);
      };
    }
  }, [socket]);

  useEffect(() => {
    // Check if we came from tables page with a selected table for taking order
    const state = location.state as {
      selectedTableId?: string;
      tableNumber?: string;
      action?: string;
    };
    if (state?.selectedTableId && state?.action === "takeOrder") {
      setPreSelectedTableId(state.selectedTableId);
      setShowOrderModal(true);
      // Clear the state to prevent re-triggering
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate]);

  const fetchData = async () => {
    try {
      const [ordersResponse, tablesData, menuData] = await Promise.all([
        apiService.getOrders({
          limit: 100,
        }),
        apiService.getTables(),
        apiService.getMenuItems(),
      ]);

      // Handle different response formats
      let ordersData: Order[];
      if (Array.isArray(ordersResponse)) {
        ordersData = ordersResponse;
      } else {
        ordersData = (ordersResponse as any).orders || [];
      }

      setOrders(ordersData);
      setTables(tablesData);
      setMenuItems(menuData.filter((item) => item.isActive));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Order Management</h1>
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1 bg-muted/50">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="flex items-center gap-1"
            >
              <List className="h-4 w-4" />
              Table
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="flex items-center gap-1"
            >
              <Grid className="h-4 w-4" />
              Grid
            </Button>
          </div>

          {(user?.role === "Cashier" || user?.role === "Admin") && (
            <Button
              onClick={() => navigate("/billing")}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Receipt className="h-4 w-4" />
              <span>Billing</span>
            </Button>
          )}
          {(user?.role === "Waiter" || user?.role === "Admin") && (
            <Button
              onClick={() => setShowOrderModal(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Order</span>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats and Actions */}
      {(user?.role === "Cashier" || user?.role === "Admin") && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200 dark:from-green-900/20 dark:to-blue-900/20 dark:border-green-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
                  Ready for Billing
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {orders.filter((order) => order.status === "Served" && !order.isBilled).length}{" "}
                  served orders across{" "}
                  {
                    new Set(
                      orders
                        .filter((order) => order.status === "Served" && !order.isBilled)
                        .map((order) =>
                          typeof order.tableId === "object"
                            ? order.tableId._id
                            : order.tableId
                        )
                    ).size
                  }{" "}
                  tables ready for billing
                </p>
              </div>
              <Button
                onClick={() => navigate("/billing")}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
              >
                <Receipt className="h-4 w-4" />
                <span>Go to Billing</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conditional rendering based on view mode */}
      {viewMode === "table" ? (
        <OrderManagement />
      ) : (
        <OrderGridView orders={orders} onOrderUpdate={fetchData} />
      )}

      {/* Order Modal */}
      <OrderModal
        isOpen={showOrderModal}
        onClose={() => {
          setShowOrderModal(false);
          setPreSelectedTableId("");
          setPreSelectedOrderId("");
        }}
        onSuccess={() => {
          fetchData();
        }}
        tables={tables}
        menuItems={menuItems}
        orders={orders}
        preSelectedTableId={preSelectedTableId}
        preSelectedOrderId={preSelectedOrderId}
      />
    </div>
  );
};

export default Orders;