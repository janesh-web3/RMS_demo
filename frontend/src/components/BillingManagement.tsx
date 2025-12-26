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
import { Bill, PaymentMethod } from "../types";
import { apiService } from "../services/api";
import {
  Eye,
  Printer,
  Search,
  Filter,
  CreditCard,
  Receipt,
  Calculator,
  Minus,
} from "lucide-react";
import Pagination from "./Pagination";
import toast from "react-hot-toast";

interface BillDetailsModalProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
  onPrint: (billId: string) => void;
}

const BillDetailsModal: React.FC<BillDetailsModalProps> = ({
  bill,
  isOpen,
  onClose,
  onPrint,
}) => {
  if (!bill) return null;

  const formatPaymentMethods = (methods: PaymentMethod[]) => {
    return methods.map((method, index) => (
      <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
        <span className="font-medium">{method.type}</span>
        <span>रू {typeof method.amount === 'string' ? parseFloat(method.amount).toFixed(2) : method.amount.toFixed(2)}</span>
      </div>
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Bill Details - #{bill.billNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bill Information */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Bill Number</label>
              <p className="text-lg font-semibold">#{bill.billNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Table</label>
              <p className="font-medium">
                {typeof bill.tableId === "object"
                  ? bill.tableId.tableNumber
                  : bill.tableId}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Subtotal</label>
              <p className="text-lg font-bold">रू {bill.subtotal.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Total</label>
              <p className="text-xl font-bold text-green-600">रू {bill.total.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tax</label>
              <p className="font-medium">रू {bill.tax.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Discount</label>
              <p className="font-medium">रू {bill.discount.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Credit Amount</label>
              <p className="font-medium">रू {(bill.creditAmount || 0).toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created At</label>
              <p className="font-medium">
                {new Date(bill.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Customer Information */}
          {bill.customerId && (
            <div className="p-4 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Customer Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Customer</label>
                  <p className="font-medium">
                    {typeof bill.customerId === "object" && bill.customerId
                      ? (bill.customerId as any).name
                      : "Customer Details"}
                  </p>
                </div>
                {typeof bill.customerId === "object" && bill.customerId && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <p className="font-medium">{(bill.customerId as any).phone || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="font-medium">{(bill.customerId as any).email || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Address</label>
                      <p className="font-medium">{(bill.customerId as any).address || "N/A"}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Orders Linked */}
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Linked Orders</h3>
            <div className="grid gap-2">
              {Array.isArray(bill.orders) && bill.orders.length > 0 ? (
                bill.orders.map((order, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="font-medium">
                      Order #{typeof order === "object" ? (order as any).orderNumber : order}
                    </span>
                    {typeof order === "object" && (
                      <span className="text-sm text-muted-foreground">
                        {new Date((order as any).createdAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No orders linked</p>
              )}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </h3>
            <div className="grid gap-2">
              {bill.paymentMethods && bill.paymentMethods.length > 0 ? (
                formatPaymentMethods(bill.paymentMethods)
              ) : (
                <p className="text-muted-foreground">No payment methods recorded</p>
              )}
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total Paid:</span>
                <span>रू {bill.paymentMethods.reduce((sum, method) =>
                  sum + (typeof method.amount === 'string' ? parseFloat(method.amount) : method.amount), 0
                ).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => onPrint(bill._id)} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print Bill
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const BillingManagement: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [filteredBills, setFilteredBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [printingBill, setPrintingBill] = useState<string>("");


  useEffect(() => {
    fetchBills();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [bills, searchTerm, paymentTypeFilter, tableFilter, customerFilter, dateRangeFilter, startDate, endDate]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const data = await apiService.getBills({
        limit: 1000, // Get more bills for proper filtering
      });
      setBills(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching bills:", error);
      toast.error("Failed to fetch bills");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bills];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (bill) =>
          bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (typeof bill.tableId === "object" &&
            bill.tableId.tableNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Payment type filter
    if (paymentTypeFilter !== "all") {
      filtered = filtered.filter((bill) =>
        bill.paymentMethods.some((method) => method.type === paymentTypeFilter)
      );
    }

    // Table filter
    if (tableFilter !== "all") {
      filtered = filtered.filter((bill) => {
        const tableId = typeof bill.tableId === "object"
          ? bill.tableId._id
          : bill.tableId;
        return tableId === tableFilter;
      });
    }

    // Customer filter
    if (customerFilter !== "all") {
      filtered = filtered.filter((bill) => {
        const customerId = typeof bill.customerId === "object" && bill.customerId
          ? (bill.customerId as any)._id
          : bill.customerId;
        return customerId === customerFilter;
      });
    }

    // Date range filter
    if (dateRangeFilter !== "all" || (startDate && endDate)) {
      const filterStartDate = new Date();
      const filterEndDate = new Date();

      if (startDate && endDate) {
        filterStartDate.setTime(new Date(startDate).getTime());
        filterEndDate.setTime(new Date(endDate).getTime());
        filterEndDate.setHours(23, 59, 59, 999);
      } else {
        switch (dateRangeFilter) {
          case "today":
            filterStartDate.setHours(0, 0, 0, 0);
            filterEndDate.setHours(23, 59, 59, 999);
            break;
          case "yesterday":
            filterStartDate.setDate(filterStartDate.getDate() - 1);
            filterStartDate.setHours(0, 0, 0, 0);
            filterEndDate.setDate(filterEndDate.getDate() - 1);
            filterEndDate.setHours(23, 59, 59, 999);
            break;
          case "week":
            filterStartDate.setDate(filterStartDate.getDate() - 7);
            break;
          case "month":
            filterStartDate.setMonth(filterStartDate.getMonth() - 1);
            break;
        }
      }

      filtered = filtered.filter((bill) => {
        const billDate = new Date(bill.createdAt);
        return billDate >= filterStartDate && billDate <= filterEndDate;
      });
    }

    setFilteredBills(filtered);
    setCurrentPage(1);
  };

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

  const handleViewDetails = (bill: Bill) => {
    setSelectedBill(bill);
    setShowDetailsModal(true);
  };

  // Get unique values for filters
  const uniquePaymentTypes = Array.from(
    new Set(
      bills.flatMap((bill) => bill.paymentMethods.map((method) => method.type))
    )
  );

  const uniqueTables = Array.from(
    new Set(
      bills.map((bill) =>
        typeof bill.tableId === "object"
          ? JSON.stringify({ id: bill.tableId._id, number: bill.tableId.tableNumber })
          : null
      ).filter(Boolean)
    )
  ).map((table) => table ? JSON.parse(table) : null).filter(Boolean);

  const uniqueCustomers = Array.from(
    new Set(
      bills
        .filter((bill) => bill.customerId)
        .map((bill) =>
          typeof bill.customerId === "object" && bill.customerId
            ? JSON.stringify({ id: (bill.customerId as any)._id, name: (bill.customerId as any).name })
            : null
        )
        .filter(Boolean)
    )
  ).map((customer) => customer ? JSON.parse(customer) : null).filter(Boolean);

  // Pagination
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBills = filteredBills.slice(startIndex, startIndex + itemsPerPage);

  // Calculate summary statistics
  const totalRevenue = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
  const totalTax = filteredBills.reduce((sum, bill) => sum + bill.tax, 0);
  const totalDiscount = filteredBills.reduce((sum, bill) => sum + bill.discount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading bills...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Billing Management</h1>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Bills</p>
                <p className="text-2xl font-bold">{filteredBills.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">रू {totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Tax</p>
                <p className="text-2xl font-bold">रू {totalTax.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Minus className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Discount</p>
                <p className="text-2xl font-bold">रू {totalDiscount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Payment Type Filter */}
            <Select value={paymentTypeFilter} onChange={(e) => setPaymentTypeFilter(e.target.value)}>
              <option value="all">All Payment Types</option>
              {uniquePaymentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
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

            {/* Customer Filter */}
            <Select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
              <option value="all">All Customers</option>
              {uniqueCustomers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
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
              <option value="custom">Custom Range</option>
            </Select>

            {/* Custom Date Range */}
            {dateRangeFilter === "custom" && (
              <>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start Date"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End Date"
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Bills ({filteredBills.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill Number</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment Methods</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBills.map((bill) => (
                <TableRow key={bill._id}>
                  <TableCell className="font-medium">
                    #{bill.billNumber}
                  </TableCell>
                  <TableCell>
                    {typeof bill.tableId === "object"
                      ? bill.tableId.tableNumber
                      : bill.tableId}
                  </TableCell>
                  <TableCell>रू {bill.subtotal.toFixed(2)}</TableCell>
                  <TableCell>रू {bill.tax.toFixed(2)}</TableCell>
                  <TableCell>रू {bill.discount.toFixed(2)}</TableCell>
                  <TableCell className="font-bold">रू {bill.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {bill.paymentMethods.map((method, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {method.type}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(bill.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(bill)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintBill(bill._id)}
                        disabled={printingBill === bill._id}
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

          {filteredBills.length === 0 && (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Receipt className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <p className="text-muted-foreground text-lg mb-2">No bills found</p>
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
          totalItems={filteredBills.length}
        />
      )}

      {/* Bill Details Modal */}
      <BillDetailsModal
        bill={selectedBill}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedBill(null);
        }}
        onPrint={handlePrintBill}
      />
    </div>
  );
};

export default BillingManagement;