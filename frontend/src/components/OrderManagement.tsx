import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Order, Table as TableType, MenuItem } from "../types";
import { apiService } from "../services/api";
import {
  Eye,
  Printer,
  Clock,
  CheckCircle,
  ChefHat,
  Utensils,
  Search,
  Filter,
  Plus,
  Edit,
  Receipt,
} from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Pagination from "./Pagination";
import OrderModal from "./modals/OrderModal";
import toast from "react-hot-toast";

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onPrint: (orderId: string) => void;
  onBilling?: (order: Order) => void;
  user?: any;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
  onPrint,
  onBilling,
  user,
}) => {
  if (!order) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "Cooking":
        return <ChefHat className="h-4 w-4 text-blue-600" />;
      case "Ready":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Served":
        return <Utensils className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Order Details - #{order.orderNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Information */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Order Number</label>
              <p className="text-lg font-semibold">#{order.orderNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Table</label>
              <p className="font-medium">
                {typeof order.tableId === "object"
                  ? order.tableId.tableNumber
                  : order.tableId}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="flex items-center gap-2">
                {getStatusIcon(order.status)}
                <span className="font-medium">{order.status}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
              <p className="text-lg font-bold">रू {order.totalAmount.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Waiter</label>
              <p className="font-medium">
                {typeof order.waiterId === "object" && order.waiterId
                  ? order.waiterId.name
                  : "N/A"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created At</label>
              <p className="font-medium">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Updated At</label>
              <p className="font-medium">
                {new Date(order.updatedAt).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Is Billed</label>
              <p className="font-medium">
                {order.isBilled ? "Yes" : "No"}
              </p>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Order Items</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Variation</TableHead>
                  <TableHead>Add-ons</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {typeof item.itemId === "object" ? item.itemId.name : "Unknown Item"}
                    </TableCell>
                    <TableCell>
                      {item.selectedVariation || "-"}
                    </TableCell>
                    <TableCell>
                      {item.addOns && item.addOns.length > 0
                        ? item.addOns.join(", ")
                        : "-"}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      {item.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      रू {(item.totalPrice / item.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      रू {item.totalPrice.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {order.status === 'Served' && !order.isBilled && onBilling && (user?.role === 'Cashier' || user?.role === 'Admin') && (
              <Button
                onClick={() => onBilling(order)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Receipt className="h-4 w-4" />
                Bill Order
              </Button>
            )}
            <Button onClick={() => onPrint(order._id)} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [waiterFilter, setWaiterFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<string>("");
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState<string>("");
  const [statusChangeAnimation, setStatusChangeAnimation] = useState<string>("");
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [selectedOrderForItems, setSelectedOrderForItems] = useState<Order | null>(null);
  const [tables, setTables] = useState<TableType[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const socket = useSocket();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (socket) {
      const handleOrderUpdated = (updatedOrder: Order) => {
        setOrders((prevOrders) => {
          const updatedOrders = prevOrders.map((order) => {
            if (order._id === updatedOrder._id) {
              // Check if status changed
              if (order.status !== updatedOrder.status) {
                // Trigger animation for status change
                setStatusChangeAnimation(updatedOrder._id);
                toast.success(`Order #${updatedOrder.orderNumber} status changed to ${updatedOrder.status}`, {
                  duration: 3000,
                  icon: getStatusIcon(updatedOrder.status),
                });
                setTimeout(() => {
                  setStatusChangeAnimation("");
                }, 2000);
              }
              return { ...updatedOrder }; // Ensure new object reference
            }
            return order;
          });
          return updatedOrders;
        });
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
    fetchOrders();
    fetchTablesAndMenuItems();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, searchTerm, statusFilter, waiterFilter, tableFilter, dateRangeFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAllOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchTablesAndMenuItems = async () => {
    try {
      const [tablesData, menuData] = await Promise.all([
        apiService.getTables(),
        apiService.getMenuItems(),
      ]);
      setTables(tablesData);
      setMenuItems(menuData.filter((item) => item.isActive));
    } catch (error) {
      console.error("Error fetching tables and menu items:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (typeof order.tableId === "object" &&
            order.tableId.tableNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Waiter filter
    if (waiterFilter !== "all") {
      filtered = filtered.filter((order) => {
        const waiterId = typeof order.waiterId === "object" && order.waiterId
          ? (order.waiterId as any)._id
          : order.waiterId;
        return waiterId === waiterFilter;
      });
    }

    // Table filter
    if (tableFilter !== "all") {
      filtered = filtered.filter((order) => {
        const tableId = typeof order.tableId === "object"
          ? order.tableId._id
          : order.tableId;
        return tableId === tableFilter;
      });
    }

    // Date range filter
    if (dateRangeFilter !== "all") {
      const filterDate = new Date();

      switch (dateRangeFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          break;
        case "yesterday":
          filterDate.setDate(filterDate.getDate() - 1);
          filterDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          filterDate.setDate(filterDate.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(filterDate.getMonth() - 1);
          break;
      }

      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.createdAt);
        if (dateRangeFilter === "today") {
          return orderDate >= filterDate && orderDate < new Date(filterDate.getTime() + 24 * 60 * 60 * 1000);
        } else if (dateRangeFilter === "yesterday") {
          const nextDay = new Date(filterDate.getTime() + 24 * 60 * 60 * 1000);
          return orderDate >= filterDate && orderDate < nextDay;
        }
        return orderDate >= filterDate;
      });
    }

    setFilteredOrders(filtered);
    setCurrentPage(1);
  };

  const handlePrintOrder = async (orderId: string) => {
    try {
      setPrintingOrder(orderId);
      await apiService.printOrder(orderId);
      toast.success("Order printed successfully!");
    } catch (error) {
      console.error("Error printing order:", error);
      toast.error("Failed to print order");
    } finally {
      setPrintingOrder("");
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingOrderStatus(orderId);
      setStatusChangeAnimation(orderId);

      // Optimistically update local state immediately
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === orderId
            ? { ...order, status: newStatus as any, updatedAt: new Date().toISOString() }
            : order
        )
      );

      await apiService.updateOrderStatus(orderId, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
      // The socket will handle the real-time update for other clients

      // Remove animation after a delay
      setTimeout(() => {
        setStatusChangeAnimation("");
      }, 2000);
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
      setStatusChangeAnimation("");

      // Revert optimistic update on error by refetching
      fetchOrders();
    } finally {
      setUpdatingOrderStatus("");
    }
  };

  const handleAddItemsToOrder = (order: Order) => {
    setSelectedOrderForItems(order);
    setShowAddItemsModal(true);
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const statusFlow = {
      'Pending': 'Cooking',
      'Cooking': 'Ready',
      'Ready': 'Served'
    };
    return statusFlow[currentStatus as keyof typeof statusFlow] || null;
  };

  const canChangeStatus = (order: Order): boolean => {
    return !order.isBilled && order.status !== 'Served';
  };

  const canAddItems = (order: Order): boolean => {
    return !order.isBilled && order.status !== 'Served';
  };

  const canShowBilling = (order: Order): boolean => {
    return order.status === 'Served' && !order.isBilled && (user?.role === 'Cashier' || user?.role === 'Admin');
  };

  const handleBilling = (order: Order) => {
    navigate("/billing", {
      state: {
        preSelectedTableId: typeof order.tableId === "object" ? order.tableId._id : order.tableId,
        fromOrderId: order._id
      }
    });
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "Cooking":
        return <ChefHat className="h-4 w-4 text-blue-600" />;
      case "Ready":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Served":
        return <Utensils className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getStatusBadgeClass = (status: string, isAnimating: boolean = false) => {
    const animationClass = isAnimating ? "animate-pulse ring-2 ring-offset-2 ring-blue-400" : "";
    switch (status) {
      case "Pending":
        return `bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700 ${animationClass}`;
      case "Cooking":
        return `bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700 ${animationClass}`;
      case "Ready":
        return `bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700 ${animationClass}`;
      case "Served":
        return `bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 ${animationClass}`;
      default:
        return `bg-muted text-muted-foreground border-border ${animationClass}`;
    }
  };

  const getStatusButtonClass = (status: string) => {
    switch (status) {
      case "Cooking":
        return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-900/40";
      case "Ready":
        return "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-900/40";
      case "Served":
        return "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700 dark:hover:bg-purple-900/40";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700";
    }
  };

  // Get unique values for filters
  const uniqueWaiters = Array.from(
    new Set(
      orders
        .filter((order) => order.waiterId)
        .map((order) =>
          typeof order.waiterId === "object" && order.waiterId
            ? JSON.stringify({ id: (order.waiterId as any)._id, name: (order.waiterId as any).name })
            : null
        )
        .filter(Boolean)
    )
  ).map((waiter) => waiter ? JSON.parse(waiter) : null).filter(Boolean);

  const uniqueTables = Array.from(
    new Set(
      orders.map((order) =>
        typeof order.tableId === "object"
          ? JSON.stringify({ id: order.tableId._id, number: order.tableId.tableNumber })
          : null
      ).filter(Boolean)
    )
  ).map((table) => table ? JSON.parse(table) : null).filter(Boolean);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

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
        <h1 className="text-3xl font-bold">Order Management</h1>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Cooking">Cooking</option>
              <option value="Ready">Ready</option>
              <option value="Served">Served</option>
            </Select>

            {/* Waiter Filter */}
            <Select value={waiterFilter} onChange={(e) => setWaiterFilter(e.target.value)}>
              <option value="all">All Waiters</option>
              {uniqueWaiters.map((waiter) => (
                <option key={waiter.id} value={waiter.id}>
                  {waiter.name}
                </option>
              ))}
            </Select>

            {/* Table Filter */}
            <Select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
              <option value="all">All Tables</option>
              {uniqueTables.map((table) => (
                <option key={table.id} value={table.id}>
                  Table {table.number}
                </option>
              ))}
            </Select>

            {/* Date Range Filter */}
            <Select value={dateRangeFilter} onChange={(e) => setDateRangeFilter(e.target.value)}>
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Orders ({filteredOrders.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Waiter</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell className="font-medium">
                    #{order.orderNumber}
                  </TableCell>
                  <TableCell>
                    {typeof order.tableId === "object"
                      ? order.tableId.tableNumber
                      : order.tableId}
                  </TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300 ${getStatusBadgeClass(order.status, statusChangeAnimation === order._id)}`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                      {statusChangeAnimation === order._id && (
                        <div className="ml-1">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    रू {order.totalAmount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {typeof order.waiterId === "object" && order.waiterId
                      ? order.waiterId.name
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {new Date(order.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(order)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                      {canAddItems(order) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddItemsToOrder(order)}
                          className="flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          Add Items
                        </Button>
                      )}
                      {canChangeStatus(order) && getNextStatus(order.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const nextStatus = getNextStatus(order.status);
                            if (nextStatus) {
                              handleStatusChange(order._id, nextStatus);
                            }
                          }}
                          disabled={updatingOrderStatus === order._id}
                          className={`flex items-center gap-1 font-medium transition-all duration-200 ${getStatusButtonClass(getNextStatus(order.status)!)} ${
                            updatingOrderStatus === order._id ? 'animate-pulse' : ''
                          }`}
                        >
                          {updatingOrderStatus === order._id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          ) : (
                            <Edit className="h-4 w-4" />
                          )}
                          {updatingOrderStatus === order._id ? 'Updating...' : `→ ${getNextStatus(order.status)}`}
                        </Button>
                      )}
                      {canShowBilling(order) && (
                        <Button
                          size="sm"
                          onClick={() => handleBilling(order)}
                          className="flex items-center gap-1 font-medium bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Receipt className="h-4 w-4" />
                          Bill Order
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintOrder(order._id)}
                        disabled={printingOrder === order._id}
                        className="flex items-center gap-1"
                      >
                        <Printer className="h-4 w-4" />
                        Print
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Utensils className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <p className="text-muted-foreground text-lg mb-2">No orders found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or search criteria
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
          totalItems={filteredOrders.length}
        />
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedOrder(null);
        }}
        onPrint={handlePrintOrder}
        onBilling={handleBilling}
        user={user}
      />

      {/* Add Items Modal */}
      <OrderModal
        isOpen={showAddItemsModal}
        onClose={() => {
          setShowAddItemsModal(false);
          setSelectedOrderForItems(null);
        }}
        onSuccess={() => {
          fetchOrders();
          setShowAddItemsModal(false);
          setSelectedOrderForItems(null);
        }}
        tables={tables}
        menuItems={menuItems}
        orders={orders}
        preSelectedTableId={
          selectedOrderForItems
            ? typeof selectedOrderForItems.tableId === "object"
              ? selectedOrderForItems.tableId._id
              : selectedOrderForItems.tableId
            : ""
        }
        preSelectedOrderId={selectedOrderForItems?._id || ""}
      />
    </div>
  );
};

export default OrderManagement;