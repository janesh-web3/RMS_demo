import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Bill, Table as TableType, PaymentMethod, Customer } from "../types";
import { apiService } from "../services/api";
import { useSocket } from "../hooks/useSocket";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Receipt,
  Printer,
  Eye,
  Calculator,
  Clock,
  CheckCircle,
  X,
  Minus,
  Plus,
  CreditCard,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import IndividualOrdersBilling from '../components/IndividualOrdersBilling';
import Pagination from '../components/Pagination';
import CustomerSelector from '../components/CustomerSelector';

interface BillPreview {
  table: {
    number: string;
    _id: string;
  };
  orders: Array<{
    orderNumber: string;
    orderTime: string;
    waiter: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      total: number;
      notes?: string;
      selectedOption?: string;
      addOns?: string[];
    }>;
    orderTotal: number;
  }>;
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  total: number;
  orderCount: number;
  createdAt: string;
}

const Billing: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [tables, setTables] = useState<TableType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [billPreview, setBillPreview] = useState<BillPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [discount, setDiscount] = useState<string>("0");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { type: "Cash", amount: "0" },
  ]);
  const [processing, setProcessing] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [printingBill, setPrintingBill] = useState<string>("");
  const [previewPrint, setPreviewPrint] = useState<string>("");
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [alreadyBilled, setAlreadyBilled] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [loadingBillDetails, setLoadingBillDetails] = useState<string>("");
  const [selectedOrdersForBilling, setSelectedOrdersForBilling] = useState<
    string[]
  >([]);
  const [availableOrdersForTable, setAvailableOrdersForTable] = useState<any[]>(
    []
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalBills, setTotalBills] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const socket = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    // Check if we came from orders page with a selected table
    const state = location.state as { 
      selectedTableId?: string; 
      preSelectedTableId?: string; 
      fromOrderId?: string; 
    };
    
    const tableId = state?.selectedTableId || state?.preSelectedTableId;
    if (tableId) {
      setSelectedTable(tableId);
      handleGetBillPreview(tableId);
    }
  }, [location.state]);

  useEffect(() => {
    if (socket) {
      socket.on("billCreated", (newBill: Bill) => {
        setBills((prev) => [newBill, ...prev]);
      });

      socket.on(
        "tableStatusUpdate",
        ({
          tableId,
          status,
        }: {
          tableId: string;
          status: "Available" | "Occupied" | "Waiting for Bill";
        }) => {
          setTables((prev) =>
            prev.map((table) =>
              table._id === tableId ? { ...table, status } : table
            )
          );
        }
      );

      return () => {
        socket.off("billCreated");
        socket.off("tableStatusUpdate");
      };
    }
  }, [socket]);

  const fetchData = async () => {
    try {
      const [billsResponse, tablesData] = await Promise.all([
        apiService.getBills({ 
          limit: itemsPerPage
        }),
        apiService.getTables(),
      ]);
      
      // Handle different response formats
      if (Array.isArray(billsResponse)) {
        setBills(billsResponse as Bill[]);
        setTotalBills(billsResponse.length);
      } else {
        setBills((billsResponse as any).bills || []);
        setTotalBills((billsResponse as any).totalCount || 0);
      }
      
      setTables(tablesData as TableType[]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetBillPreview = async (
    tableId: string,
    selectedOrders?: string[]
  ) => {
    try {
      setLoadingPreview(true);
      setAlreadyBilled(false);

      // First, get available orders for this table if not provided
      if (!selectedOrders) {
        const orders = (await apiService.getOrdersByTable(
          tableId,
          "Served"
        )) as any[];
        const unbilledOrders = orders.filter((order: any) => !order.isBilled);
        setAvailableOrdersForTable(unbilledOrders);

        // If multiple unbilled orders exist, show selection UI
        if (unbilledOrders.length > 1) {
          setSelectedTable(tableId);
          setShowPreview(true);
          setBillPreview(null); // Don't show preview yet, show order selection first
          return;
        }

        // If only one order, use it automatically
        selectedOrders =
          unbilledOrders.length === 1 ? [unbilledOrders[0]._id] : [];
      }

      const preview = await apiService.getBillPreview(
        tableId,
        parseFloat(discount) || 0,
        selectedOrders
      );
      setBillPreview(preview as BillPreview);
      setSelectedTable(tableId);
      setShowPreview(true);
      setAlreadyBilled((preview as any).alreadyBilled || false);
      setSelectedOrdersForBilling(selectedOrders || []);
    } catch (error: any) {
      console.error("Error getting bill preview:", error);
      if (error.message.includes("already been billed")) {
        setAlreadyBilled(true);
        toast.error(
          "This table has already been billed. You can only print the existing bill."
        );
      } else {
        toast.error(
          "Error getting bill preview. Please check if there are served orders for this table."
        );
      }
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCreateBill = async () => {
    if (!selectedTable || !billPreview) return;

    const discountNum = parseFloat(discount) || 0;
    const totalPayment = paymentMethods.reduce(
      (sum, method) => sum + (parseFloat(method.amount.toString()) || 0),
      0
    );
    const billTotal = billPreview.subtotal + billPreview.tax - discountNum;

    // Check if credit payment is used and validate customer selection
    const creditPayment = paymentMethods.find(method => method.type === 'Credit');
    if (creditPayment && parseFloat(creditPayment.amount.toString()) > 0) {
      if (!selectedCustomer) {
        toast.error("Please select a customer when using credit payment");
        return;
      }
    }

    // Validate discount doesn't exceed subtotal + tax
    if (discountNum > billPreview.subtotal + billPreview.tax) {
      toast.error(
        `Discount (रू ${discountNum.toFixed(2)}) cannot exceed bill subtotal + tax (रू ${(billPreview.subtotal + billPreview.tax).toFixed(2)})`
      );
      return;
    }

    // Validate payment doesn't exceed bill total
    if (totalPayment > billTotal) {
      toast.error(
        `Payment total (रू ${totalPayment.toFixed(2)}) cannot exceed bill total (रू ${billTotal.toFixed(2)}). Please adjust payment amounts.`
      );
      return;
    }

    if (Math.abs(totalPayment - billTotal) > 0.01) {
      toast.error(
        `Payment total (रू ${totalPayment.toFixed(
          2
        )}) must match bill total (रू ${billTotal.toFixed(2)})`
      );
      return;
    }

    try {
      setProcessing(true);
      const billData = {
        tableId: selectedTable,
        paymentMethods: paymentMethods.filter((method) => (parseFloat(method.amount.toString()) || 0) > 0),
        discount: discountNum,
        selectedOrders:
          selectedOrdersForBilling.length > 0
            ? selectedOrdersForBilling
            : undefined,
        customerId: selectedCustomer?._id,
      };

      await apiService.createBill(billData);
      setShowPreview(false);
      setBillPreview(null);
      setSelectedTable("");
      setDiscount("0");
      setPaymentMethods([{ type: "Cash", amount: "0" }]);
      setSelectedCustomer(null);
      fetchData();
      toast.success("Bill created successfully!");
    } catch (error) {
      console.error("Error creating bill:", error);
      toast.error("Error creating bill. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentMethodChange = (
    index: number,
    field: "type" | "amount",
    value: string | number
  ) => {
    const updatedMethods = [...paymentMethods];
    if (field === "type") {
      updatedMethods[index].type = value as PaymentMethod["type"];
    } else {
      updatedMethods[index].amount = value.toString();
    }
    setPaymentMethods(updatedMethods);
  };

  const addPaymentMethod = () => {
    setPaymentMethods([...paymentMethods, { type: "Cash", amount: "0" }]);
  };

  const removePaymentMethod = (index: number) => {
    if (paymentMethods.length > 1) {
      setPaymentMethods(paymentMethods.filter((_, i) => i !== index));
    }
  };

  const autoFillRemainingAmount = () => {
    if (!billPreview) return;

    const discountNum = parseFloat(discount) || 0;
    const billTotal = billPreview.subtotal + billPreview.tax - discountNum;
    const currentTotal = paymentMethods.reduce(
      (sum, method) => sum + (parseFloat(method.amount.toString()) || 0),
      0
    );
    const remaining = billTotal - currentTotal;

    if (remaining > 0 && paymentMethods.length > 0) {
      const updatedMethods = [...paymentMethods];
      const currentAmount = parseFloat(updatedMethods[updatedMethods.length - 1].amount.toString()) || 0;
      const newAmount = currentAmount + remaining;
      
      if (newAmount > billTotal) {
        toast.error(`Cannot add remaining amount. Total would exceed bill total (रू ${billTotal.toFixed(2)})`);
        updatedMethods[updatedMethods.length - 1].amount = billTotal.toFixed(2);
      } else {
        updatedMethods[updatedMethods.length - 1].amount = newAmount.toFixed(2);
      }
      
      setPaymentMethods(updatedMethods);
      toast.success(`Added remaining amount: रू ${remaining.toFixed(2)}`);
    } else if (remaining <= 0) {
      toast('No remaining amount to add. Payment is already complete.');
    }
  };

  // Auto-fill the full amount when initially generating a bill
  const autoFillFullAmount = () => {
    if (!billPreview) return;

    const discountNum = parseFloat(discount) || 0;
    const billTotal = billPreview.subtotal + billPreview.tax - discountNum;
    
    if (billTotal <= 0) {
      toast.error('Cannot auto-fill. Bill total is zero or negative.');
      return;
    }
    
    setPaymentMethods([{ type: "Cash", amount: billTotal.toFixed(2) }]);
    toast.success(`Auto-filled full amount: रू ${billTotal.toFixed(2)}`);
  };

  // Auto-fill remaining amount to credit
  const autoFillRemainingToCredit = () => {
    if (!billPreview) return;

    if (!selectedCustomer) {
      toast.error("Please select a customer first to use credit payment");
      return;
    }

    const discountNum = parseFloat(discount) || 0;
    const billTotal = billPreview.subtotal + billPreview.tax - discountNum;
    const currentTotal = paymentMethods.reduce(
      (sum, method) => sum + (parseFloat(method.amount.toString()) || 0),
      0
    );
    const remaining = billTotal - currentTotal;

    if (remaining > 0) {
      // Check if there's already a credit payment method
      const creditMethodIndex = paymentMethods.findIndex(method => method.type === 'Credit');
      
      if (creditMethodIndex >= 0) {
        // Update existing credit payment
        const updatedMethods = [...paymentMethods];
        const currentCreditAmount = parseFloat(updatedMethods[creditMethodIndex].amount.toString()) || 0;
        updatedMethods[creditMethodIndex].amount = (currentCreditAmount + remaining).toFixed(2);
        setPaymentMethods(updatedMethods);
      } else {
        // Add new credit payment method
        setPaymentMethods([...paymentMethods, { type: "Credit", amount: remaining.toFixed(2) }]);
      }
      
      toast.success(`Added रू ${remaining.toFixed(2)} to credit`);
    } else if (remaining <= 0) {
      toast('No remaining amount to add to credit. Payment is already complete.');
    }
  };

  // Auto-fill full amount when bill preview is first loaded
  useEffect(() => {
    if (billPreview && paymentMethods.length === 1 && parseFloat(paymentMethods[0].amount.toString()) === 0) {
      autoFillFullAmount();
    }
  }, [billPreview]);

  const handlePrintBill = async (billId: string) => {
    try {
      setPrintingBill(billId);
      await apiService.printBill(billId);
      toast.success("Bill printed successfully!");
    } catch (error) {
      console.error("Error printing bill:", error);
      toast.error("Failed to print bill");
    } finally {
      setPrintingBill("");
    }
  };

  const handleViewBillDetails = async (billId: string) => {
    try {
      setLoadingBillDetails(billId);
      const billDetails = await apiService.getBill(billId);
      setSelectedBill(billDetails as Bill);
      setShowBillDetails(true);
    } catch (error) {
      console.error("Error fetching bill details:", error);
      toast.error("Failed to load bill details");
    } finally {
      setLoadingBillDetails("");
    }
  };

  const generatePrintPreview = (preview: BillPreview): string => {
    const now = new Date();

    let content = `RESTAURANT NAME
123 Main Street
City, State 12345
Tel: (555) 123-4567
================================
         CUSTOMER BILL
================================
Table: ${preview.table.number}
Date: ${now.toLocaleDateString()}
Time: ${now.toLocaleTimeString()}

ITEMS:
--------------------------------`;

    preview.orders.forEach((order) => {
      content += `\nOrder #${order.orderNumber}`;
      content += `\nWaiter: ${order.waiter}\n`;

      order.items.forEach((item) => {
        const itemLine = `${item.name.substring(0, 20)} x${item.quantity}`;
        const priceStr = `रू ${item.total.toFixed(2)}`;
        const spaces = Math.max(1, 32 - itemLine.length - priceStr.length);
        content += `${itemLine}${" ".repeat(spaces)}${priceStr}\n`;

        if (item.selectedOption) {
          content += `  + ${item.selectedOption}\n`;
        }
        if (item.addOns && item.addOns.length > 0) {
          content += `  + ${item.addOns.join(", ")}\n`;
        }
        if (item.notes) {
          content += `  Note: ${item.notes}\n`;
        }
      });
      content += "\n";
    });

    content += `--------------------------------
Subtotal:              रू ${preview.subtotal.toFixed(2)}
Tax (${preview.taxRate}%):             रू ${preview.tax.toFixed(2)}`;

    if (preview.discount > 0) {
      content += `\nDiscount:             -रू ${preview.discount.toFixed(2)}`;
    }

    content += `
================================
TOTAL:                 रू ${preview.total.toFixed(2)}
================================
Payment Methods: ${paymentMethods
      .map((m) => `${m.type} रू ${(parseFloat(m.amount.toString()) || 0).toFixed(2)}`)
      .join(", ")}

Thank you for dining with us!
Please come again!

Print Time: ${now.toLocaleTimeString()}
================================`;

    return content;
  };

  const handleShowPrintPreview = () => {
    if (billPreview) {
      const printContent = generatePrintPreview(billPreview);
      setPreviewPrint(printContent);
      setShowPrintPreview(true);
    }
  };

  const waitingForBillTables = tables.filter(
    (table) => table.status === "Waiting for Bill"
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">Loading...</div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Billing & Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Process customer payments and generate bills
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => navigate("/billing-management")}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span>View Bills</span>
          </Button>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-card px-3 py-2 rounded-lg border">
          <Clock className="h-4 w-4" />
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Tables Waiting for Bill - Mobile Optimized */}
      {waitingForBillTables.length > 0 && (
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Receipt className="h-5 w-5 text-red-600" />
              <span>Tables Ready for Billing</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {waitingForBillTables.map((table) => (
                <Card
                  key={table._id}
                  className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">
                          Table {table.tableNumber}
                        </h3>
                        <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                          Waiting for Bill
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleGetBillPreview(table._id)}
                        loading={loadingPreview}
                        loadingText="Loading..."
                        className="flex items-center space-x-1"
                      >
                        <Calculator className="h-3 w-3" />
                        <span className="hidden sm:inline">Generate</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Orders Ready for Billing */}
      <IndividualOrdersBilling 
        bills={bills}
        onBillOrder={handleGetBillPreview}
        loadingPreview={loadingPreview}
      />

      {/* Bill Preview Modal - Mobile Optimized */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                Bill Preview - Table{" "}
                {billPreview?.table?.number || selectedTable}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 space-y-4">
              {/* Order Selection for Multiple Orders */}
              {!billPreview && availableOrdersForTable.length > 1 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">
                    Select Orders to Bill
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This table has multiple orders. Select which orders to
                    include in this bill:
                  </p>
                  <div className="space-y-2">
                    {availableOrdersForTable.map((order) => (
                      <div
                        key={order._id}
                        className="flex items-center space-x-3 p-3 border rounded-lg"
                      >
                        <input
                          type="checkbox"
                          id={`order-${order._id}`}
                          checked={selectedOrdersForBilling.includes(order._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrdersForBilling([
                                ...selectedOrdersForBilling,
                                order._id,
                              ]);
                            } else {
                              setSelectedOrdersForBilling(
                                selectedOrdersForBilling.filter(
                                  (id) => id !== order._id
                                )
                              );
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <label
                          htmlFor={`order-${order._id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="font-medium">
                            Order #{order.orderNumber}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.items.length} items • रू{" "}
                            {order.totalAmount.toFixed(2)} •{" "}
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() =>
                        handleGetBillPreview(
                          selectedTable,
                          selectedOrdersForBilling
                        )
                      }
                      disabled={selectedOrdersForBilling.length === 0}
                      loading={loadingPreview}
                      loadingText="Loading..."
                    >
                      Generate Bill for Selected Orders
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedOrdersForBilling(
                          availableOrdersForTable.map((o) => o._id)
                        );
                      }}
                    >
                      Select All
                    </Button>
                  </div>
                </div>
              )}

              {/* Order Details */}
              {billPreview && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">
                    Order Details ({billPreview.orderCount} orders)
                  </h3>
                  {billPreview.orders.map((order, index) => (
                    <Card key={index} className="bg-muted/50">
                      <CardContent className="p-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                          <span className="font-medium text-foreground">
                            Order #{order.orderNumber}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(order.orderTime).toLocaleTimeString()} -{" "}
                            {order.waiter}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {order.items.map((item, itemIndex) => (
                            <div
                              key={itemIndex}
                              className="flex justify-between text-sm border-b border-border/30 pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-foreground">
                                  {item.name}
                                </div>

                                {/* Show selected variation */}
                                {(item as any).selectedVariation && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary">
                                      Size: {(item as any).selectedVariation}
                                    </span>
                                  </div>
                                )}

                                {/* Show add-ons */}
                                {item.addOns && item.addOns.length > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    <span className="font-medium">
                                      Add-ons:
                                    </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {item.addOns.map((addOn, addOnIndex) => (
                                        <span
                                          key={addOnIndex}
                                          className="inline-flex items-center px-2 py-1 rounded-full bg-secondary text-secondary-foreground"
                                        >
                                          {addOn}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Show special notes */}
                                {item.notes && (
                                  <div className="text-xs text-muted-foreground italic mt-1 p-2 bg-muted/50 rounded">
                                    <span className="font-medium">Note:</span>{" "}
                                    {item.notes}
                                  </div>
                                )}

                                {/* Show pricing breakdown */}
                                <div className="text-xs text-muted-foreground mt-1">
                                  रू {item.price?.toFixed(2) || "0.00"} ×{" "}
                                  {item.quantity}
                                  {(item as any).addOnPrice > 0 && (
                                    <span>
                                      {" "}
                                      + रू {(item as any).addOnPrice.toFixed(
                                        2
                                      )}{" "}
                                      (add-ons)
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <div className="text-sm text-muted-foreground">
                                  Qty: {item.quantity}
                                </div>
                                <div className="font-bold text-foreground">
                                  रू {item.total.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Customer Selection - Only show when credit payment is used */}
              {billPreview && paymentMethods.some(method => method.type === 'Credit' && parseFloat(method.amount.toString()) > 0) && (
                <CustomerSelector
                  selectedCustomer={selectedCustomer}
                  onCustomerSelect={setSelectedCustomer}
                  showCreateOption={true}
                  required={true}
                />
              )}

              {/* Discount Input */}
              {billPreview && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Discount Amount</label>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentDiscount = parseFloat(discount) || 0;
                        const newDiscount = Math.max(0, currentDiscount - 5);
                        setDiscount(newDiscount.toString());
                      }}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="text"
                      value={discount}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers and decimal point
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          // Check if the new value would exceed maximum allowed discount
                          const numValue = parseFloat(value);
                          if (billPreview && !isNaN(numValue)) {
                            const maxDiscount = billPreview.subtotal + billPreview.tax;
                            if (numValue > maxDiscount) {
                              // Don't allow the input, show error message
                              toast.error(`Maximum discount allowed is रू ${maxDiscount.toFixed(2)}`);
                              return; // Block the input
                            }
                          }
                          setDiscount(value);
                        }
                      }}
                      onPaste={(e) => {
                        // Prevent pasting values that exceed maximum
                        e.preventDefault();
                        const pastedValue = e.clipboardData.getData('text');
                        const numValue = parseFloat(pastedValue);
                        if (billPreview && !isNaN(numValue)) {
                          const maxDiscount = billPreview.subtotal + billPreview.tax;
                          if (numValue > maxDiscount) {
                            toast.error(`Cannot paste. Maximum discount allowed is रू ${maxDiscount.toFixed(2)}`);
                            return;
                          }
                        }
                        if (/^\d*\.?\d*$/.test(pastedValue)) {
                          setDiscount(pastedValue);
                        }
                      }}
                      onBlur={() => {
                        // Format the value on blur
                        const numValue = parseFloat(discount) || 0;
                        setDiscount(numValue.toFixed(2));
                      }}
                      placeholder="0.00"
                      className="text-center w-24"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentDiscount = parseFloat(discount) || 0;
                        if (!billPreview) return;
                        const maxDiscount = billPreview.subtotal + billPreview.tax;
                        const requestedDiscount = currentDiscount + 5;
                        
                        if (requestedDiscount > maxDiscount) {
                          toast.error(`Cannot increase. Maximum discount allowed is रू ${maxDiscount.toFixed(2)}`);
                          return; // Don't change the value
                        } else {
                          setDiscount(requestedDiscount.toString());
                        }
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGetBillPreview(selectedTable)}
                    >
                      Update
                    </Button>
                  </div>
                </div>
              )}

              {/* Payment Methods */}
              {billPreview && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      Payment Methods
                    </label>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addPaymentMethod}
                        className="flex items-center space-x-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Method</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={autoFillFullAmount}
                        className="flex items-center space-x-1"
                      >
                        <span>Full Amount</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={autoFillRemainingAmount}
                        className="flex items-center space-x-1"
                      >
                        <span>Remaining</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={autoFillRemainingToCredit}
                        className="flex items-center space-x-1"
                        disabled={!selectedCustomer}
                      >
                        <CreditCard className="h-3 w-3" />
                        <span>Add to Credit</span>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {paymentMethods.map((method, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 p-2 border rounded bg-background"
                      >
                        <select
                          value={method.type}
                          onChange={(e) =>
                            handlePaymentMethodChange(
                              index,
                              "type",
                              e.target.value
                            )
                          }
                          className="border rounded px-2 py-1 text-sm bg-background text-foreground border-border"
                        >
                          <option value="Cash">Cash</option>
                          <option value="E-sewa">E-sewa</option>
                          <option value="Khalti">Khalti</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Credit">Credit</option>
                        </select>

                        <Input
                          type="text"
                          value={method.amount}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow only numbers and decimal point
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              // Check if the new value would exceed maximum allowed payment
                              const numValue = parseFloat(value);
                              if (billPreview && !isNaN(numValue)) {
                                const discountNum = parseFloat(discount) || 0;
                                const billTotal = billPreview.subtotal + billPreview.tax - discountNum;
                                if (numValue > billTotal) {
                                  // Don't allow the input, show error message
                                  toast.error(`Maximum payment allowed is रू ${billTotal.toFixed(2)}`);
                                  return; // Block the input
                                }
                              }
                              handlePaymentMethodChange(index, "amount", value);
                            }
                          }}
                          onPaste={(e) => {
                            // Prevent pasting values that exceed maximum
                            e.preventDefault();
                            const pastedValue = e.clipboardData.getData('text');
                            const numValue = parseFloat(pastedValue);
                            if (billPreview && !isNaN(numValue)) {
                              const discountNum = parseFloat(discount) || 0;
                              const billTotal = billPreview.subtotal + billPreview.tax - discountNum;
                              if (numValue > billTotal) {
                                toast.error(`Cannot paste. Maximum payment allowed is रू ${billTotal.toFixed(2)}`);
                                return;
                              }
                            }
                            if (/^\d*\.?\d*$/.test(pastedValue)) {
                              handlePaymentMethodChange(index, "amount", pastedValue);
                            }
                          }}
                          onBlur={() => {
                            // Format the value on blur
                            const numValue = parseFloat(method.amount.toString()) || 0;
                            handlePaymentMethodChange(index, "amount", numValue.toFixed(2));
                          }}
                          placeholder="0.00"
                          className="text-sm"
                        />

                        {paymentMethods.length > 1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removePaymentMethod(index)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Payment Total:</span>
                      <span
                        className={`font-medium ${
                          billPreview &&
                          Math.abs(
                            paymentMethods.reduce(
                              (sum, method) => sum + (parseFloat(method.amount.toString()) || 0),
                              0
                            ) -
                              (billPreview.subtotal +
                                billPreview.tax -
                                (parseFloat(discount) || 0))
                          ) > 0.01
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        रू{" "}
                        {paymentMethods
                          .reduce((sum, method) => sum + (parseFloat(method.amount.toString()) || 0), 0)
                          .toFixed(2)}
                      </span>
                    </div>
                    {billPreview && (
                      <div className="flex justify-between">
                        <span>Bill Total:</span>
                        <span className="font-medium text-foreground">
                          रू{" "}
                          {(
                            billPreview.subtotal +
                            billPreview.tax -
                            (parseFloat(discount) || 0)
                          ).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bill Summary */}
              {billPreview && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-foreground">
                        <span>Subtotal:</span>
                        <span>रू {billPreview.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-foreground">
                        <span>Tax ({billPreview.taxRate}%):</span>
                        <span>रू {billPreview.tax.toFixed(2)}</span>
                      </div>
                      {(parseFloat(discount) || 0) > 0 && (
                        <div className="flex justify-between text-green-600 dark:text-green-400">
                          <span>Discount:</span>
                          <span>-रू {(parseFloat(discount) || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 flex justify-between text-lg font-bold text-foreground">
                        <span>Total:</span>
                        <span>
                          रू{" "}
                          {(
                            billPreview.subtotal +
                            billPreview.tax -
                            (parseFloat(discount) || 0)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              {billPreview && (
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button
                    onClick={handleShowPrintPreview}
                    variant="outline"
                    className="flex items-center justify-center space-x-1"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Preview Print</span>
                  </Button>
                  <Button
                    onClick={handleCreateBill}
                    loading={processing}
                    loadingText="Processing..."
                    disabled={processing || alreadyBilled}
                    className="flex items-center justify-center space-x-1 flex-1"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      {alreadyBilled ? "Already Billed" : "Generate Bill"}
                    </span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background border rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                Thermal Print Preview
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrintPreview(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <div className="bg-black text-white p-4 rounded font-mono text-xs whitespace-pre-wrap">
                {previewPrint}
              </div>
              <div className="mt-4 text-center">
                <Button
                  onClick={() => setShowPrintPreview(false)}
                  className="w-full"
                >
                  Close Preview
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Bills */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Recent Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bills.map((bill) => (
              <Card key={bill._id} className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        Bill #{bill.billNumber}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Table{" "}
                        {typeof bill.tableId === "object"
                          ? bill.tableId.tableNumber
                          : bill.tableId}{" "}
                        •{new Date(bill.createdAt).toLocaleString()} •
                        {bill.paymentMethods.map((pm) => pm.type).join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-lg text-foreground">
                        रू {bill.total.toFixed(2)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewBillDetails(bill._id)}
                        loading={loadingBillDetails === bill._id}
                        loadingText="Loading..."
                        className="flex items-center space-x-1"
                      >
                        <Eye className="h-3 w-3" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePrintBill(bill._id)}
                        loading={printingBill === bill._id}
                        loadingText="Printing..."
                        className="flex items-center space-x-1"
                      >
                        <Printer className="h-3 w-3" />
                        <span className="hidden sm:inline">Print</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {bills.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No bills found</p>
            </div>
          )}

          {/* Pagination */}
          {totalBills > 0 && (
            <div className="mt-6 pt-4 border-t">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalBills / itemsPerPage)}
                totalItems={totalBills}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                itemsPerPageOptions={[5, 10, 25, 50]}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill Details Dialog */}
      <Dialog open={showBillDetails} onOpenChange={setShowBillDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Receipt className="h-5 w-5" />
              <span>Bill Details - #{selectedBill?.billNumber}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedBill && (
            <div className="space-y-4">
              {/* Bill Header Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Table Number</p>
                  <p className="font-semibold text-foreground">
                    {typeof selectedBill.tableId === "object"
                      ? selectedBill.tableId.tableNumber
                      : selectedBill.tableId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Bill Date & Time
                  </p>
                  <p className="font-semibold text-foreground">
                    {new Date(selectedBill.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Payment Methods
                  </p>
                  <p className="font-semibold text-foreground">
                    {selectedBill.paymentMethods
                      .map((pm) => `${pm.type} (रू ${typeof pm.amount === 'number' ? pm.amount.toFixed(2) : parseFloat(pm.amount.toString()).toFixed(2)})`)
                      .join(", ")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-bold text-lg text-green-600 dark:text-green-400">
                    रू {selectedBill.total.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Ordered Items */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-foreground">
                  Ordered Items
                </h3>
                {Array.isArray(selectedBill.orders) &&
                  selectedBill.orders.map((order: any, orderIndex) => (
                    <Card key={orderIndex} className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium text-foreground">
                            Order #{order.orderNumber}
                          </h4>
                          <span className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {order.items?.map((item: any, itemIndex: number) => (
                            <div
                              key={itemIndex}
                              className="flex justify-between items-start py-2 border-b border-border/50 last:border-b-0"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-foreground">
                                  {typeof item.itemId === "object"
                                    ? item.itemId.name
                                    : "Unknown Item"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Quantity: {item.quantity} × रू{" "}
                                  {item.itemPrice?.toFixed(2) || "0.00"}
                                </p>

                                {/* Show selected variation */}
                                {item.selectedVariation && (
                                  <p className="text-xs text-muted-foreground">
                                    Variation: {item.selectedVariation}
                                  </p>
                                )}

                                {/* Show add-ons */}
                                {item.addOns && item.addOns.length > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    Add-ons: {item.addOns.join(", ")}
                                    {item.addOnPrice > 0 &&
                                      ` (+रू ${item.addOnPrice.toFixed(2)})`}
                                  </p>
                                )}

                                {/* Show special notes */}
                                {item.notes && (
                                  <p className="text-xs text-muted-foreground italic">
                                    Note: {item.notes}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-foreground">
                                  रू {item.totalPrice?.toFixed(2) || "0.00"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>

              {/* Bill Summary */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-foreground">
                      <span>Subtotal:</span>
                      <span>रू {selectedBill.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-foreground">
                      <span>Tax (10%):</span>
                      <span>रू {selectedBill.tax.toFixed(2)}</span>
                    </div>
                    {selectedBill.discount > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Discount:</span>
                        <span>-रू {selectedBill.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between text-lg font-bold text-foreground">
                      <span>Total:</span>
                      <span>रू {selectedBill.total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => handlePrintBill(selectedBill._id)}
                  loading={printingBill === selectedBill._id}
                  loadingText="Printing..."
                  className="flex items-center justify-center space-x-2"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Bill</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowBillDetails(false)}
                  className="flex items-center justify-center space-x-2"
                >
                  <span>Close</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;
