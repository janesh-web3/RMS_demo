import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Customer, CreditTransaction } from "../types";
import { apiService } from "../services/api";
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CreditCard, 
  History,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter
} from "lucide-react";
import Pagination from "../components/Pagination";

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCredit, setFilterCredit] = useState<'all' | 'with-credit' | 'no-credit'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalCustomers, setTotalCustomers] = useState(0);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Forms
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: ""
  });
  const [creditPaymentForm, setCreditPaymentForm] = useState({
    amount: "",
    description: ""
  });
  
  // Credit history
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, searchTerm, filterCredit]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCustomers({
        search: searchTerm || undefined,
        hasCredit: filterCredit === 'with-credit' ? true : filterCredit === 'no-credit' ? false : undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        sortBy: 'name',
        sortOrder: 'asc'
      });
      
      setCustomers((response as any).customers || []);
      setTotalCustomers((response as any).totalCount || 0);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!customerForm.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    try {
      setProcessing(true);
      const newCustomer = await apiService.createCustomer({
        name: customerForm.name.trim(),
        phone: customerForm.phone.trim() || undefined,
        email: customerForm.email.trim() || undefined,
        address: customerForm.address.trim() || undefined
      });
      
      setCustomers(prev => [newCustomer as Customer, ...prev]);
      setShowCreateModal(false);
      setCustomerForm({ name: "", phone: "", email: "", address: "" });
      toast.success("Customer created successfully");
    } catch (error: any) {
      console.error("Error creating customer:", error);
      toast.error(error.message || "Failed to create customer");
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer || !customerForm.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    try {
      setProcessing(true);
      const updatedCustomer = await apiService.updateCustomer(selectedCustomer._id, {
        name: customerForm.name.trim(),
        phone: customerForm.phone.trim() || undefined,
        email: customerForm.email.trim() || undefined,
        address: customerForm.address.trim() || undefined
      });
      
      setCustomers(prev => 
        prev.map(customer => 
          customer._id === selectedCustomer._id ? updatedCustomer as Customer : customer
        )
      );
      setShowEditModal(false);
      setSelectedCustomer(null);
      setCustomerForm({ name: "", phone: "", email: "", address: "" });
      toast.success("Customer updated successfully");
    } catch (error: any) {
      console.error("Error updating customer:", error);
      toast.error(error.message || "Failed to update customer");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (customer.creditBalance > 0) {
      toast.error(`Cannot delete customer with outstanding credit balance of रू ${customer.creditBalance.toFixed(2)}`);
      return;
    }

    if (!confirm(`Are you sure you want to delete customer "${customer.name}"?`)) {
      return;
    }

    try {
      await apiService.deleteCustomer(customer._id);
      setCustomers(prev => prev.filter(c => c._id !== customer._id));
      toast.success("Customer deleted successfully");
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      toast.error(error.message || "Failed to delete customer");
    }
  };

  const handleAddCreditPayment = async () => {
    if (!selectedCustomer || !creditPaymentForm.amount) {
      toast.error("Payment amount is required");
      return;
    }

    const amount = parseFloat(creditPaymentForm.amount);
    if (amount <= 0) {
      toast.error("Payment amount must be greater than 0");
      return;
    }

    if (amount > selectedCustomer.creditBalance) {
      toast.error(`Payment amount cannot exceed credit balance of रू ${selectedCustomer.creditBalance.toFixed(2)}`);
      return;
    }

    try {
      setProcessing(true);
      const response = await apiService.addCreditPayment(selectedCustomer._id, {
        amount,
        description: creditPaymentForm.description.trim() || undefined
      });
      
      // Update customer in the list
      setCustomers(prev => 
        prev.map(customer => 
          customer._id === selectedCustomer._id 
            ? { ...customer, creditBalance: (response as any).newBalance }
            : customer
        )
      );
      
      setShowCreditModal(false);
      setSelectedCustomer(null);
      setCreditPaymentForm({ amount: "", description: "" });
      toast.success("Credit payment recorded successfully");
    } catch (error: any) {
      console.error("Error adding credit payment:", error);
      toast.error(error.message || "Failed to record credit payment");
    } finally {
      setProcessing(false);
    }
  };

  const handleViewCreditHistory = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    
    try {
      const response = await apiService.getCreditHistory(customer._id, { limit: 50 });
      setCreditHistory((response as any).transactions || []);
    } catch (error: any) {
      console.error("Error fetching credit history:", error);
      toast.error("Failed to fetch credit history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerForm({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || ""
    });
    setShowEditModal(true);
  };

  const openCreditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCreditPaymentForm({ amount: "", description: "" });
    setShowCreditModal(true);
  };

  const totalPages = Math.ceil(totalCustomers / itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading customers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Customer Management</h1>
          <p className="text-muted-foreground">Manage customers and credit accounts</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Customer</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={filterCredit}
                onChange={(e) => {
                  setFilterCredit(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="all">All Customers</option>
                <option value="with-credit">With Credit</option>
                <option value="no-credit">No Credit</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((customer) => (
          <Card key={customer._id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{customer.name}</CardTitle>
                  {customer.creditBalance > 0 && (
                    <div className="text-sm text-red-600 font-medium mt-1">
                      Credit: रू {customer.creditBalance.toFixed(2)}
                    </div>
                  )}
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(customer)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCustomer(customer)}
                    disabled={customer.creditBalance > 0}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.phone && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{customer.address}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  Total Credit: रू {customer.totalCreditGiven.toFixed(2)}
                </div>
                <div className="flex space-x-1">
                  {customer.creditBalance > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCreditModal(customer)}
                      className="text-xs"
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Pay
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewCreditHistory(customer)}
                    className="text-xs"
                  >
                    <History className="h-3 w-3 mr-1" />
                    History
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {customers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No customers found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterCredit !== 'all' 
                ? "Try adjusting your search or filters" 
                : "Get started by adding your first customer"}
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCustomers}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Create Customer Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={customerForm.name}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Customer name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={customerForm.phone}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email address"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <Input
                value={customerForm.address}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Address"
              />
            </div>
            <div className="flex space-x-2 pt-4">
              <Button 
                onClick={handleCreateCustomer} 
                disabled={processing}
                className="flex-1"
              >
                {processing ? "Creating..." : "Create Customer"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={customerForm.name}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Customer name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={customerForm.phone}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email address"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <Input
                value={customerForm.address}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Address"
              />
            </div>
            <div className="flex space-x-2 pt-4">
              <Button 
                onClick={handleUpdateCustomer} 
                disabled={processing}
                className="flex-1"
              >
                {processing ? "Updating..." : "Update Customer"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowEditModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credit Payment Modal */}
      <Dialog open={showCreditModal} onOpenChange={setShowCreditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Credit Payment</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="font-medium">{selectedCustomer.name}</div>
                <div className="text-sm text-muted-foreground">
                  Current Credit Balance: रू {selectedCustomer.creditBalance.toFixed(2)}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Payment Amount *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedCustomer.creditBalance}
                  value={creditPaymentForm.amount}
                  onChange={(e) => setCreditPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={creditPaymentForm.description}
                  onChange={(e) => setCreditPaymentForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Payment description (optional)"
                />
              </div>
              <div className="flex space-x-2 pt-4">
                <Button 
                  onClick={handleAddCreditPayment} 
                  disabled={processing}
                  className="flex-1"
                >
                  {processing ? "Recording..." : "Record Payment"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreditModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Credit History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Credit History</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="font-medium">{selectedCustomer.name}</div>
                <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">Current Balance</div>
                    <div className="font-medium">रू {selectedCustomer.creditBalance.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Credit Given</div>
                    <div className="font-medium">रू {selectedCustomer.totalCreditGiven.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Paid</div>
                    <div className="font-medium">रू {selectedCustomer.totalCreditPaid.toFixed(2)}</div>
                  </div>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {loadingHistory ? (
                  <div className="text-center py-8">Loading history...</div>
                ) : creditHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No credit transactions found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {creditHistory.map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {transaction.type === 'Credit' ? (
                            <TrendingUp className="h-4 w-4 text-red-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-green-500" />
                          )}
                          <div>
                            <div className="font-medium">
                              {transaction.type === 'Credit' ? 'Credit Added' : 'Payment Received'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {transaction.description || 'No description'}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(transaction.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className={`font-medium ${
                          transaction.type === 'Credit' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {transaction.type === 'Credit' ? '+' : '-'}रू {transaction.amount.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;