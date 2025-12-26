import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Order } from "../types";
import { apiService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Printer,
  Clock,
  CheckCircle,
  ChefHat,
  Utensils,
  Receipt,
  MoreVertical,
  Eye,
  Search,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../hooks/useSocket";
import Pagination from "./Pagination";
import toast from "react-hot-toast";

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onPrint: (orderId: string) => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
  onPrint,
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
                  ? (order.waiterId as any).name
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
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-start p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">
                      {typeof item.itemId === "object" ? item.itemId.name : "Unknown Item"}
                    </h4>
                    {item.selectedVariation && (
                      <p className="text-sm text-muted-foreground">Variation: {item.selectedVariation}</p>
                    )}
                    {item.addOns && item.addOns.length > 0 && (
                      <p className="text-sm text-muted-foreground">Add-ons: {item.addOns.join(", ")}</p>
                    )}
                    {item.notes && (
                      <p className="text-sm text-muted-foreground">Notes: {item.notes}</p>
                    )}
                    <p className="text-sm font-medium">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">रू {item.totalPrice.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      रू {(item.totalPrice / item.quantity).toFixed(2)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
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

interface OrderGridViewProps {
  orders: Order[];
  onOrderUpdate: () => void;
}

const OrderGridView: React.FC<OrderGridViewProps> = ({ orders, onOrderUpdate }) => {
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [waiterFilter, setWaiterFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string>("");
  const [printingOrder, setPrintingOrder] = useState<string>("");
  const [statusChangeAnimation, setStatusChangeAnimation] = useState<string>("");

  const { user } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (socket) {
      const handleOrderUpdated = () => {
        onOrderUpdate();
      };

      const handleNewOrder = () => {
        onOrderUpdate();
      };

      socket.on("orderUpdated", handleOrderUpdated);
      socket.on("newOrder", handleNewOrder);

      return () => {
        socket.off("orderUpdated", handleOrderUpdated);
        socket.off("newOrder", handleNewOrder);
      };
    }
  }, [socket, onOrderUpdate]);

  useEffect(() => {
    applyFilters();
  }, [orders, searchTerm, statusFilter, waiterFilter, tableFilter, dateRangeFilter]);

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
      setUpdatingStatus(orderId);
      setStatusChangeAnimation(orderId);

      // Call onOrderUpdate immediately for optimistic update
      onOrderUpdate();

      await apiService.updateOrderStatus(orderId, newStatus);
      setShowStatusMenu(null);
      toast.success(`Order status updated to ${newStatus}`, {
        duration: 3000,
        icon: getStatusIcon(newStatus),
      });

      // Call onOrderUpdate again to ensure latest data
      onOrderUpdate();

      // Remove animation after a delay
      setTimeout(() => {
        setStatusChangeAnimation("");
      }, 2000);
    } catch (error: any) {
      console.error("Error updating order status:", error);
      toast.error(error.message || "Failed to update order status");
      setStatusChangeAnimation("");
      // Refresh data on error
      onOrderUpdate();
    } finally {
      setUpdatingStatus("");
    }
  };

  const canUpdateStatus = (order: Order): boolean => {
    if (order.isBilled) return false;

    if (user?.role === "Admin") return true;
    if (
      user?.role === "Kitchen" &&
      (order.status === "Pending" || order.status === "Cooking")
    )
      return true;
    if (user?.role === "Waiter" && order.status === "Ready") return true;
    return false;
  };

  const getStatusOptions = (currentStatus: string): string[] => {
    const statusOrder = ["Pending", "Cooking", "Ready", "Served"];
    const currentStatusIndex = statusOrder.indexOf(currentStatus);

    if (user?.role === "Admin") {
      return statusOrder.slice(currentStatusIndex + 1);
    }

    if (user?.role === "Kitchen") {
      if (currentStatus === "Pending") return ["Cooking"];
      if (currentStatus === "Cooking") return ["Ready"];
    }

    if (user?.role === "Waiter") {
      if (currentStatus === "Ready") return ["Served"];
    }

    return [];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case "Cooking":
        return <ChefHat className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case "Ready":
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "Served":
        return <Utensils className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string, orderId?: string) => {
    const isAnimating = statusChangeAnimation === orderId || updatingStatus === orderId;
    const animationClass = isAnimating ? "animate-pulse ring-2 ring-offset-2 ring-blue-400 transform scale-105" : "";

    switch (status) {
      case "Pending":
        return `bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700 ${animationClass}`;
      case "Cooking":
        return `bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 ${animationClass}`;
      case "Ready":
        return `bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700 ${animationClass}`;
      case "Served":
        return `bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700 ${animationClass}`;
      default:
        return `bg-muted text-muted-foreground border-border ${animationClass}`;
    }
  };

  const getStatusButtonClass = (status: string) => {
    switch (status) {
      case "Cooking":
        return "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-900/40";
      case "Ready":
        return "bg-green-50 text-green-700 border-green-300 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-600 dark:hover:bg-green-900/40";
      case "Served":
        return "bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-600 dark:hover:bg-purple-900/40";
      default:
        return "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700";
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

  return (
    <div className="space-y-6">
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

      {/* Orders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {paginatedOrders.map((order) => (
          <Card
            key={order._id}
            className={`${getStatusColor(order.status, order._id)} animate-fade-in transition-all duration-300`}
          >
            <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base sm:text-lg truncate">
                    Order #{order.orderNumber}
                  </CardTitle>
                  <div className="flex items-center space-x-1 mt-1">
                    {getStatusIcon(order.status)}
                    <span className="text-xs sm:text-sm font-medium">
                      {order.status}
                    </span>
                    {statusChangeAnimation === order._id && (
                      <div className="ml-1">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                <p>
                  Table:{" "}
                  {typeof order.tableId === "object"
                    ? order.tableId.tableNumber
                    : order.tableId}
                </p>
                <p>Time: {new Date(order.createdAt).toLocaleTimeString()}</p>
                {order.waiterId && typeof order.waiterId === "object" && (
                  <p className="hidden sm:block">
                    Waiter: {(order.waiterId as any).name}
                  </p>
                )}
                <p className="font-medium text-foreground">
                  Total: रू {order.totalAmount.toFixed(2)}
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="space-y-2 mb-3 sm:mb-4">
                {order.items.slice(0, 3).map((item, index) => (
                  <div key={index} className="text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="truncate">
                        {typeof item.itemId === "object"
                          ? item.itemId.name
                          : "Unknown Item"}
                      </span>
                      <span className="ml-2 font-medium">x{item.quantity}</span>
                    </div>
                    {item.selectedVariation && (
                      <div className="text-muted-foreground ml-2 text-xs hidden sm:block">
                        • {item.selectedVariation}
                      </div>
                    )}
                    {item.addOns && item.addOns.length > 0 && (
                      <div className="text-muted-foreground ml-2 text-xs hidden sm:block">
                        • Add-ons: {item.addOns.join(", ")}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-muted-foreground ml-2 italic text-xs hidden sm:block">
                        Note: {item.notes}
                      </div>
                    )}
                  </div>
                ))}
                {order.items.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{order.items.length - 3} more items
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1 sm:gap-2">
                {/* Status Change Actions */}
                {canUpdateStatus(order) && (
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setShowStatusMenu(
                          showStatusMenu === order._id ? null : order._id
                        )
                      }
                      className="flex items-center space-x-1 touch-target"
                    >
                      <MoreVertical className="h-3 w-3" />
                      <span className="hidden sm:inline">Status</span>
                    </Button>

                    {showStatusMenu === order._id && (
                      <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-md shadow-lg z-10 min-w-32">
                        {getStatusOptions(order.status).map((status) => (
                          <button
                            key={status}
                            onClick={() =>
                              handleStatusChange(order._id, status)
                            }
                            className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent hover:text-accent-foreground first:rounded-t-md last:rounded-b-md"
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Status Actions for specific roles */}
                {user?.role === "Kitchen" && order.status === "Pending" && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(order._id, "Cooking")}
                    disabled={updatingStatus === order._id}
                    className={`touch-target font-medium transition-all duration-200 ${getStatusButtonClass("Cooking")} ${
                      updatingStatus === order._id ? 'animate-pulse' : ''
                    }`}
                  >
                    {updatingStatus === order._id ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                    ) : (
                      <ChefHat className="h-3 w-3" />
                    )}
                    <span className="hidden sm:inline ml-1">{updatingStatus === order._id ? 'Starting...' : '→ Cooking'}</span>
                    <span className="sm:hidden ml-1">{updatingStatus === order._id ? '...' : 'Cook'}</span>
                  </Button>
                )}

                {user?.role === "Kitchen" && order.status === "Cooking" && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(order._id, "Ready")}
                    disabled={updatingStatus === order._id}
                    className={`touch-target font-medium transition-all duration-200 ${getStatusButtonClass("Ready")} ${
                      updatingStatus === order._id ? 'animate-pulse' : ''
                    }`}
                  >
                    {updatingStatus === order._id ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                    ) : (
                      <CheckCircle className="h-3 w-3" />
                    )}
                    <span className="hidden sm:inline ml-1">{updatingStatus === order._id ? 'Marking...' : '→ Ready'}</span>
                    <span className="sm:hidden ml-1">{updatingStatus === order._id ? '...' : 'Ready'}</span>
                  </Button>
                )}

                {(user?.role === "Waiter" || user?.role === "Admin") &&
                  order.status === "Ready" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(order._id, "Served")}
                      disabled={updatingStatus === order._id}
                      className={`touch-target font-medium transition-all duration-200 ${getStatusButtonClass("Served")} ${
                        updatingStatus === order._id ? 'animate-pulse' : ''
                      }`}
                    >
                      {updatingStatus === order._id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                      ) : (
                        <Utensils className="h-3 w-3" />
                      )}
                      <span className="hidden sm:inline ml-1">{updatingStatus === order._id ? 'Serving...' : '→ Served'}</span>
                      <span className="sm:hidden ml-1">{updatingStatus === order._id ? '...' : 'Served'}</span>
                    </Button>
                  )}

                {/* Billing - for served orders */}
                {order.status === "Served" && !order.isBilled && (user?.role === "Cashier" || user?.role === "Admin") && (
                  <Button
                    size="sm"
                    onClick={() => navigate("/billing", {
                      state: {
                        preSelectedTableId: typeof order.tableId === "object" ? order.tableId._id : order.tableId,
                        fromOrderId: order._id
                      }
                    })}
                    className="flex items-center space-x-1 touch-target bg-green-600 hover:bg-green-700"
                  >
                    <Receipt className="h-3 w-3" />
                    <span className="hidden sm:inline">Bill</span>
                  </Button>
                )}

                {/* Print Order */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePrintOrder(order._id)}
                  disabled={printingOrder === order._id}
                  className="flex items-center space-x-1 touch-target"
                >
                  <Printer className="h-3 w-3" />
                  <span className="hidden sm:inline">Print</span>
                </Button>

                {/* View Details - for all orders */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedOrder(order);
                    setShowDetailsModal(true);
                  }}
                  className="flex items-center space-x-1 touch-target"
                >
                  <Eye className="h-3 w-3" />
                  <span className="hidden sm:inline">Details</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
      />
    </div>
  );
};

export default OrderGridView;