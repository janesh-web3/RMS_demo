import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
} from "../components/ui/card";
import { Table as TableType } from "../types";
import { apiService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Plus, Edit, Trash2, Receipt, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SafeDeleteConfirmation from "../components/SafeDeleteConfirmation";
import TableModal from "../components/modals/TableModal";

const Tables: React.FC = () => {
  const [tables, setTables] = useState<TableType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<TableType | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string>("");
  const [deletingTable, setDeletingTable] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<TableType | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await apiService.getTables();
      setTables(response);
    } catch (error) {
      console.error("Error fetching tables:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = () => {
    setEditingTable(null);
    setShowTableModal(true);
  };

  const handleEditTable = (table: TableType) => {
    setEditingTable(table);
    setShowTableModal(true);
  };

  const handleUpdateTableStatus = async (tableId: string, status: string) => {
    try {
      setUpdatingStatus(tableId);
      await apiService.updateTable(tableId, { status });
      fetchTables();
    } catch (error) {
      console.error("Error updating table status:", error);
      toast.error("Failed to update table status. Please try again.");
    } finally {
      setUpdatingStatus("");
    }
  };

  const handleDeleteTable = (table: TableType) => {
    setTableToDelete(table);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTable = async () => {
    if (!tableToDelete) return;

    try {
      setDeletingTable(tableToDelete._id);
      await apiService.deleteTable(tableToDelete._id);
      fetchTables();
      toast.success("Table deleted successfully!");
      setShowDeleteConfirm(false);
      setTableToDelete(null);
    } catch (error) {
      console.error("Error deleting table:", error);
      toast.error("Failed to delete table. Please try again.");
    } finally {
      setDeletingTable("");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700";
      case "Occupied":
        return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700";
      case "Waiting for Bill":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Tables</h1>
        {user?.role === "Admin" && (
          <Button
            onClick={handleAddTable}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Table</span>
          </Button>
        )}
      </div>



      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 overflow-hidden">
        {tables.map((table) => (
          <Card
            key={table._id}
            className={`transition-all hover:shadow-md cursor-pointer animate-fade-in ${getStatusColor(
              table.status
            )}`}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="text-center">
                <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">
                  Table {table.tableNumber}
                </h3>
                <p className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">
                  {table.status}
                </p>

                {(user?.role === "Waiter" || user?.role === "Admin") &&
                  table.status !== "Waiting for Bill" && (
                    <div className="space-y-1 sm:space-y-2">
                      <Button
                        size="sm"
                        className="w-full text-xs sm:text-sm touch-target btn-hover"
                        onClick={() => {
                          if (table.status === "Available") {
                            // Navigate to orders page with pre-selected table for taking order
                            navigate("/orders", { 
                              state: { 
                                selectedTableId: table._id,
                                tableNumber: table.tableNumber,
                                action: "takeOrder"
                              } 
                            });
                          } else {
                            // Clear table (set to Available)
                            handleUpdateTableStatus(table._id, "Available");
                          }
                        }}
                        loading={updatingStatus === table._id}
                        loadingText="..."
                      >
                        <span className="hidden sm:inline">
                          {table.status === "Available"
                            ? "Take Order"
                            : "Clear Table"}
                        </span>
                        <span className="sm:hidden">
                          {table.status === "Available" ? "Take" : "Clear"}
                        </span>
                      </Button>
                    </div>
                  )}

                {/* Admin Controls */}
                {user?.role === "Admin" && (
                  <div className="space-y-1 sm:space-y-2 mt-2">
                    {/* Quick Action Buttons */}
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate("/orders")}
                        title="Manage Orders"
                        className="flex-1 touch-target"
                      >
                        <ClipboardList className="h-3 w-3" />
                        <span className="sr-only sm:not-sr-only sm:ml-1 hidden sm:inline">
                          Orders
                        </span>
                      </Button>
                      {table.status === "Waiting for Bill" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate("/billing", {
                              state: { selectedTableId: table._id },
                            })
                          }
                          className="flex-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 touch-target"
                          title="Generate Bill"
                        >
                          <Receipt className="h-3 w-3" />
                          <span className="sr-only sm:not-sr-only sm:ml-1 hidden sm:inline">
                            Bill
                          </span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTable(table)}
                        title="Edit Table"
                        className="touch-target"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteTable(table)}
                        loading={deletingTable === table._id}
                        loadingText=""
                        title="Delete Table"
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 touch-target"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Cashier Bill Access */}
                {user?.role === "Cashier" &&
                  table.status === "Waiting for Bill" && (
                    <div className="space-y-2 mt-2">
                      <Button
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() =>
                          navigate("/billing", {
                            state: { selectedTableId: table._id },
                          })
                        }
                      >
                        <Receipt className="h-3 w-3 mr-1" />
                        Generate Bill
                      </Button>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      </Card>

      {tables.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No tables found</p>
          {user?.role === "Admin" && (
            <Button className="mt-4" onClick={handleAddTable}>
              Add Your First Table
            </Button>
          )}
        </div>
      )}

      {/* Table Modal - Lazy loaded */}
      {showTableModal && (
        <TableModal
          isOpen={showTableModal}
          onClose={() => {
            setShowTableModal(false);
            setEditingTable(null);
          }}
          onSuccess={() => {
            fetchTables();
          }}
          editingTable={editingTable}
        />
      )}

      {/* Safe Delete Confirmation Dialog */}
      <SafeDeleteConfirmation
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setTableToDelete(null);
        }}
        onConfirm={confirmDeleteTable}
        itemName={tableToDelete ? `Table ${tableToDelete.tableNumber}` : ""}
        itemType="Table"
        loading={deletingTable !== ""}
      />
    </div>
  );
};

export default Tables;
