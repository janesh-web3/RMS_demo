import React from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import BillingManagementComponent from "../components/BillingManagement";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Plus, Receipt } from "lucide-react";

const BillingManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Billing Management</h1>
        <div className="flex items-center space-x-2">
          {(user?.role === "Cashier" || user?.role === "Admin") && (
            <Button
              onClick={() => navigate("/billing")}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Bill</span>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200 dark:from-blue-900/20 dark:to-green-900/20 dark:border-blue-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">
                Bill Management & Reports
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                View all bills, track payments, and generate billing reports
              </p>
            </div>
            <Button
              onClick={() => navigate("/billing")}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Receipt className="h-4 w-4" />
              <span>Create New Bill</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing Management Component */}
      <BillingManagementComponent />
    </div>
  );
};

export default BillingManagement;