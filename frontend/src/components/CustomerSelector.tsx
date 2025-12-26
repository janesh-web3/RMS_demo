import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Customer } from "../types";
import { apiService } from "../services/api";
import { Search, Plus, User, CreditCard, Phone, Mail } from "lucide-react";
import toast from "react-hot-toast";

interface CustomerSelectorProps {
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
  showCreateOption?: boolean;
  required?: boolean;
}

const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  selectedCustomer,
  onCustomerSelect,
  showCreateOption = true,
  required = false
}) => {
  const [showSelector, setShowSelector] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: ""
  });

  useEffect(() => {
    if (showSelector) {
      fetchCustomers();
    }
  }, [showSelector, searchTerm]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCustomers({
        search: searchTerm || undefined,
        limit: 20,
        sortBy: 'name',
        sortOrder: 'asc'
      });
      setCustomers((response as any).customers || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerForm.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    try {
      setCreating(true);
      const newCustomer = await apiService.createCustomer({
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim() || undefined,
        email: newCustomerForm.email.trim() || undefined,
        address: newCustomerForm.address.trim() || undefined
      });
      
      // Select the newly created customer
      onCustomerSelect(newCustomer as Customer);
      setShowCreateModal(false);
      setShowSelector(false);
      setNewCustomerForm({ name: "", phone: "", email: "", address: "" });
      toast.success("Customer created and selected");
    } catch (error: any) {
      console.error("Error creating customer:", error);
      toast.error(error.message || "Failed to create customer");
    } finally {
      setCreating(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    onCustomerSelect(customer);
    setShowSelector(false);
  };

  const handleClearSelection = () => {
    onCustomerSelect(null);
  };

  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Customer {required && <span className="text-red-500">*</span>}
        </label>
        
        {selectedCustomer ? (
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
            <div className="flex items-center space-x-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{selectedCustomer.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedCustomer.phone && (
                    <span className="flex items-center space-x-1">
                      <Phone className="h-3 w-3" />
                      <span>{selectedCustomer.phone}</span>
                    </span>
                  )}
                  {selectedCustomer.creditBalance > 0 && (
                    <div className="flex items-center space-x-1 text-red-600 mt-1">
                      <CreditCard className="h-3 w-3" />
                      <span>Credit: रू {selectedCustomer.creditBalance.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSelector(true)}
              >
                Change
              </Button>
              {!required && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSelection}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowSelector(true)}
            className="w-full justify-start"
          >
            <User className="h-4 w-4 mr-2" />
            Select Customer
          </Button>
        )}
      </div>

      {/* Customer Selector Modal */}
      <Dialog open={showSelector} onOpenChange={setShowSelector}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Create New Customer Button */}
            {showCreateOption && (
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(true)}
                className="w-full justify-start"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Customer
              </Button>
            )}

            {/* Customer List */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {loading ? (
                <div className="text-center py-4">Loading customers...</div>
              ) : customers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {searchTerm ? "No customers found" : "No customers available"}
                </div>
              ) : (
                customers.map((customer) => (
                  <div
                    key={customer._id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {customer.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Mail className="h-3 w-3" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                      {customer.creditBalance > 0 && (
                        <div className="flex items-center space-x-1 text-red-600 mt-1">
                          <CreditCard className="h-3 w-3" />
                          <span>Credit: रू {customer.creditBalance.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Customer Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={newCustomerForm.name}
                onChange={(e) => setNewCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Customer name"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={newCustomerForm.phone}
                onChange={(e) => setNewCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone number"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={newCustomerForm.email}
                onChange={(e) => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email address"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Address</label>
              <Input
                value={newCustomerForm.address}
                onChange={(e) => setNewCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Address"
              />
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button 
                onClick={handleCreateCustomer} 
                disabled={creating}
                className="flex-1"
              >
                {creating ? "Creating..." : "Create & Select"}
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
    </>
  );
};

export default CustomerSelector;