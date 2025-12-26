import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Plus, Minus, X } from "lucide-react";
import { Table as TableType, MenuItem, OrderItem, Order } from "../../types";
import { OrderItemSelector } from "../OrderItemSelector";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tables: TableType[];
  menuItems: MenuItem[];
  orders: Order[];
  preSelectedTableId?: string;
  preSelectedOrderId?: string;
}

const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  tables,
  menuItems,
  orders,
  preSelectedTableId,
  preSelectedOrderId,
}) => {
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [selectedExistingOrder, setSelectedExistingOrder] =
    useState<string>("");
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (preSelectedTableId && isOpen) {
      setSelectedTable(preSelectedTableId);
    }
    if (preSelectedOrderId && isOpen) {
      setSelectedExistingOrder(preSelectedOrderId);
    }
  }, [preSelectedTableId, preSelectedOrderId, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = useCallback(() => {
    setSelectedTable(preSelectedTableId || "");
    setCurrentOrder([]);
    setSessionId("");
    setSelectedExistingOrder(preSelectedOrderId || "");
  }, [preSelectedTableId, preSelectedOrderId]);

  // Memoize expensive calculations (commented out as not currently used)
  // const availableTables = useMemo(
  //   () => tables.filter((table) => table.status === "Available"),
  //   [tables]
  // );

  // const occupiedTables = useMemo(
  //   () => tables.filter((table) => table.status === "Occupied"),
  //   [tables]
  // );

  const getTotalAmount = useCallback(() => {
    return currentOrder.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [currentOrder]);

  const getExistingOrders = useCallback(() => {
    if (!selectedTable) return [];

    return orders.filter(
      (order) =>
        (typeof order.tableId === "object"
          ? order.tableId._id
          : order.tableId) === selectedTable &&
        !order.isBilled
    );
  }, [selectedTable, orders]);

  const handleAddItemToOrder = (menuItem: MenuItem) => {
    setSelectedMenuItem(menuItem);
    setShowItemSelector(true);
  };

  const handleOrderItemSelected = (orderData: {
    itemId: string;
    quantity: number;
    selectedVariation?: string;
    addOns: string[];
    notes?: string;
    itemPrice: number;
    addOnPrice: number;
    totalPrice: number;
  }) => {
    const newItem: OrderItem = {
      itemId: orderData.itemId,
      quantity: orderData.quantity,
      notes: orderData.notes,
      selectedVariation: orderData.selectedVariation,
      addOns: orderData.addOns,
      itemPrice: orderData.itemPrice,
      addOnPrice: orderData.addOnPrice,
      totalPrice: orderData.totalPrice,
    };

    // Check if item already exists in current order
    const existingItemIndex = currentOrder.findIndex(
      (item) =>
        item.itemId === newItem.itemId &&
        item.selectedVariation === newItem.selectedVariation &&
        JSON.stringify(item.addOns?.sort()) ===
          JSON.stringify(newItem.addOns?.sort()) &&
        item.notes === newItem.notes
    );

    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const updatedOrder = [...currentOrder];
      updatedOrder[existingItemIndex].quantity += newItem.quantity;
      updatedOrder[existingItemIndex].totalPrice =
        (updatedOrder[existingItemIndex].itemPrice +
          updatedOrder[existingItemIndex].addOnPrice) *
        updatedOrder[existingItemIndex].quantity;
      setCurrentOrder(updatedOrder);
      toast.success("Item quantity updated!");
    } else {
      // Add new item
      setCurrentOrder([...currentOrder, newItem]);
      toast.success("Item added to order!");
    }

    setShowItemSelector(false);
    setSelectedMenuItem(null);
  };

  const handleUpdateOrderItem = (
    index: number,
    updates: Partial<OrderItem>
  ) => {
    const updatedOrder = [...currentOrder];
    const item = { ...updatedOrder[index], ...updates };

    // Recalculate price based on variations and add-ons
    const menuItem = menuItems.find((mi) => mi._id === item.itemId);
    if (menuItem) {
      let basePrice = menuItem.price;
      if (item.selectedVariation && menuItem.variations) {
        const variation = menuItem.variations.find(
          (v) => v.name === item.selectedVariation
        );
        basePrice = variation ? variation.price : menuItem.price;
      }

      const addOnPrice =
        item.addOns?.reduce((sum, addOnName) => {
          const addOn = menuItem.addOns?.find((ao) => ao.name === addOnName);
          return sum + (addOn?.price || 0);
        }, 0) || 0;

      item.itemPrice = basePrice;
      item.addOnPrice = addOnPrice;
      item.totalPrice = (basePrice + addOnPrice) * item.quantity;
    }

    updatedOrder[index] = item;
    setCurrentOrder(updatedOrder);
  };

  const handleRemoveOrderItem = (index: number) => {
    setCurrentOrder(currentOrder.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedTable || currentOrder.length === 0) return;

    try {
      setLoading(true);

      if (selectedExistingOrder) {
        // Add items to existing order
        const itemsData = currentOrder.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          notes: item.notes,
          selectedVariation: item.selectedVariation,
          addOns: item.addOns,
        }));

        await apiService.addItemsToOrder(selectedExistingOrder, itemsData);
        toast.success("Items added to existing order successfully!");
      } else {
        // Create new order
        const selectedTableObj = tables.find((t) => t._id === selectedTable);
        let orderSessionId = sessionId;

        // For occupied tables, use existing session ID from first order
        if (selectedTableObj?.status === "Occupied") {
          const tableOrders = orders.filter(
            (order) =>
              (typeof order.tableId === "object"
                ? order.tableId._id
                : order.tableId) === selectedTable &&
              !order.isBilled &&
              order.status !== "Served"
          );
          if (tableOrders.length > 0) {
            orderSessionId = tableOrders[0].sessionId || "";
          }
        }

        const orderData = {
          tableId: selectedTable,
          items: currentOrder.map((item) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            notes: item.notes,
            selectedVariation: item.selectedVariation,
            addOns: item.addOns,
            itemPrice: item.itemPrice,
            addOnPrice: item.addOnPrice,
            totalPrice: item.totalPrice,
          })),
          sessionId: orderSessionId || undefined,
        };

        await apiService.createOrder(orderData);
        toast.success("Order created successfully!");
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating/updating order:", error);
      toast.error("Failed to process order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {selectedExistingOrder ? "Add Items to Existing Order" : "Create New Order"}
            </DialogTitle>
            {selectedExistingOrder && (
              <div className="text-sm text-green-600 dark:text-green-400 mt-2">
                Adding items to Order #{orders.find(o => o._id === selectedExistingOrder)?.orderNumber}
              </div>
            )}
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Left Side - Order Configuration */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Table *
                  </label>
                  <select
                    value={selectedTable}
                    onChange={(e) => {
                      setSelectedTable(e.target.value);
                      setSelectedExistingOrder("");
                    }}
                    className="w-full border border-input bg-background text-foreground rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Choose a table...</option>
                    {tables
                      .filter((table) => table.status === "Available")
                      .map((table) => (
                        <option key={table._id} value={table._id}>
                          Table {table.tableNumber} (Available)
                        </option>
                      ))}
                    {tables
                      .filter((table) => table.status === "Occupied")
                      .map((table) => (
                        <option key={table._id} value={table._id}>
                          Table {table.tableNumber} (Occupied)
                        </option>
                      ))}
                  </select>
                </div>

                {/* Show existing orders for occupied tables */}
                {selectedTable &&
                  tables.find((t) => t._id === selectedTable)?.status ===
                    "Occupied" && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Add to Existing Order (Optional)
                      </label>
                      <select
                        value={selectedExistingOrder}
                        onChange={(e) =>
                          setSelectedExistingOrder(e.target.value)
                        }
                        className="w-full border border-input bg-background text-foreground rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="">Create New Order</option>
                        {getExistingOrders().map((order) => (
                          <option key={order._id} value={order._id}>
                            Order #{order.orderNumber} ({order.status}) - रू{" "}
                            {order.totalAmount.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                {/* Session ID only for new orders */}
                {!selectedExistingOrder && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Session ID (Optional)
                    </label>
                    <Input
                      placeholder="For split orders, use same session ID"
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Menu Items */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Menu Items</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-2">
                  {menuItems.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          रू {item.price.toFixed(2)}
                          {item.variations && item.variations.length > 0 && (
                            <span className="ml-1">(base price)</span>
                          )}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddItemToOrder(item)}
                        className="ml-2"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side - Current Order */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Current Order</h3>
                <div className="text-lg font-bold text-primary">
                  Total: रू {getTotalAmount().toFixed(2)}
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto border rounded-md p-2">
                {currentOrder.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No items added yet. Select items from the menu.
                  </div>
                ) : (
                  currentOrder.map((item, index) => {
                    const menuItem = menuItems.find(
                      (mi) => mi._id === item.itemId
                    );
                    return (
                      <div key={index} className="border rounded p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{menuItem?.name}</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveOrderItem(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <label className="block font-medium mb-1">
                              Quantity
                            </label>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleUpdateOrderItem(index, {
                                    quantity: Math.max(1, item.quantity - 1),
                                  })
                                }
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center">
                                {item.quantity}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleUpdateOrderItem(index, {
                                    quantity: item.quantity + 1,
                                  })
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <div>
                            <label className="block font-medium mb-1">
                              Total Price
                            </label>
                            <div className="text-lg font-semibold text-primary">
                              रू {item.totalPrice.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {item.selectedVariation && (
                          <div className="text-sm text-muted-foreground">
                            Variation: {item.selectedVariation}
                          </div>
                        )}

                        {item.addOns && item.addOns.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Add-ons: {item.addOns.join(", ")}
                          </div>
                        )}

                        {item.notes && (
                          <div className="text-sm text-muted-foreground">
                            Notes: {item.notes}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-4 border-t">
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !selectedTable || currentOrder.length === 0 || loading
                  }
                  className="flex-1"
                >
                  {loading
                    ? "Processing..."
                    : selectedExistingOrder
                    ? "Add to Order"
                    : "Create Order"}
                </Button>
                <Button variant="outline" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showItemSelector && (
        <OrderItemSelector
          isOpen={showItemSelector}
          onClose={() => {
            setShowItemSelector(false);
            setSelectedMenuItem(null);
          }}
          onSelect={handleOrderItemSelected}
          menuItem={selectedMenuItem}
        />
      )}
    </>
  );
};

export default OrderModal;
